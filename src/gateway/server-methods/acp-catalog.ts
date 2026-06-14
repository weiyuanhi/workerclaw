// Gateway RPC handlers for ACP setup catalog and harness auth shown by Control UI.
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  type AcpCatalogResult,
  type AcpHarnessAuthLoginResult,
  validateAcpCatalogParams,
  validateAcpHarnessAuthLoginParams,
} from "../../../packages/gateway-protocol/src/index.js";
import { resolveAcpSetupCatalog } from "../../acp/catalog.js";
import { startHarnessLogin } from "../../acp/harness-auth.js";
import { resolveAcpHarnessAuthEntries } from "../../acp/harness-auth-probe.js";
import { resolveAcpHarnessAuthSpec } from "../../shared/acp-harness-auth-spec.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestHandlers } from "./types.js";

function resolveHarnessAuthProbeIds(params: {
  cfg: OpenClawConfig;
  harnessIds: readonly string[];
}): string[] {
  const acp = params.cfg.acp;
  if (acp?.enabled !== true) {
    return [];
  }
  const selected = new Set<string>();
  const defaultAgent = typeof acp.defaultAgent === "string" ? acp.defaultAgent.trim().toLowerCase() : "";
  if (defaultAgent) {
    selected.add(defaultAgent);
  }
  for (const harnessId of acp.allowedAgents ?? []) {
    if (typeof harnessId === "string" && harnessId.trim()) {
      selected.add(harnessId.trim().toLowerCase());
    }
  }
  return params.harnessIds.filter(
    (harnessId) => selected.has(harnessId) && Boolean(resolveAcpHarnessAuthSpec(harnessId)),
  );
}

/** Gateway request handlers for ACP setup catalog queries. */
export const acpCatalogHandlers: GatewayRequestHandlers = {
  "acp.catalog": async ({ params, respond, context }) => {
    if (!validateAcpCatalogParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid acp.catalog params: ${formatValidationErrors(validateAcpCatalogParams.errors)}`,
        ),
      );
      return;
    }
    const cfg = context.getRuntimeConfig();
    const catalog = resolveAcpSetupCatalog({ cfg });
    const harnessAuth = await resolveAcpHarnessAuthEntries({
      cfg,
      harnessIds: resolveHarnessAuthProbeIds({ cfg, harnessIds: catalog.harnessIds }),
    });
    const result: AcpCatalogResult = {
      backends: catalog.backends,
      harnessIds: catalog.harnessIds,
      ...(harnessAuth.length > 0 ? { harnessAuth } : {}),
    };
    respond(true, result, undefined);
  },
  "acp.harnessAuth.login": async ({ params, respond, context }) => {
    if (!validateAcpHarnessAuthLoginParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid acp.harnessAuth.login params: ${formatValidationErrors(validateAcpHarnessAuthLoginParams.errors)}`,
        ),
      );
      return;
    }
    const spec = resolveAcpHarnessAuthSpec(params.harnessId);
    if (!spec) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `unsupported harness: ${params.harnessId}`),
      );
      return;
    }
    const result = await startHarnessLogin({
      harnessId: spec.harnessId,
      cfg: context.getRuntimeConfig(),
    });
    if (!result.started) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, result.message));
      return;
    }
    const payload: AcpHarnessAuthLoginResult = {
      harnessId: spec.harnessId,
      started: true,
      message: result.message,
      ...(result.cliCommand ? { cliCommand: result.cliCommand } : {}),
      ...(result.pid ? { pid: result.pid } : {}),
    };
    respond(true, payload, undefined);
  },
};
