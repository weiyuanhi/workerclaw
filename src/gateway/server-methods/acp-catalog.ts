// Gateway RPC handler for ACP setup catalog shown by Control UI.
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  type AcpCatalogResult,
  validateAcpCatalogParams,
} from "../../../packages/gateway-protocol/src/index.js";
import { resolveAcpSetupCatalog } from "../../acp/catalog.js";
import type { GatewayRequestHandlers } from "./types.js";

/** Gateway request handlers for ACP setup catalog queries. */
export const acpCatalogHandlers: GatewayRequestHandlers = {
  "acp.catalog": ({ params, respond, context }) => {
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
    const catalog = resolveAcpSetupCatalog({ cfg: context.getRuntimeConfig() });
    const result: AcpCatalogResult = {
      backends: catalog.backends,
      harnessIds: catalog.harnessIds,
    };
    respond(true, result, undefined);
  },
};
