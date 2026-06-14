/** Gateway-side ACP setup catalog helpers with runtime backend registration. */
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  mergeAcpHarnessIds,
  resolveAcpxCustomHarnessIds,
  resolveAcpBackendCatalogEntries,
  resolveAcpSetupCatalog as resolveSharedAcpSetupCatalog,
  resolveSuggestedAcpBackendId,
  type AcpBackendCatalogEntry,
  type AcpSetupCatalog,
} from "../shared/acp-setup-catalog.js";
import { listAcpRuntimeBackendSummaries } from "./runtime/registry.js";

export {
  ACPX_BUILTIN_HARNESS_IDS,
  ACP_KNOWN_BACKEND_IDS,
  mergeAcpCatalogEntries,
  mergeAcpHarnessIds,
  resolveAcpxCustomHarnessIds,
  resolveSuggestedAcpBackendId,
  type AcpBackendCatalogEntry,
  type AcpRuntimeBackendSummary,
  type AcpSetupCatalog,
} from "../shared/acp-setup-catalog.js";

/** Resolves the full ACP setup catalog including live runtime backend registration. */
export function resolveAcpSetupCatalog(params: {
  cfg?: OpenClawConfig | null;
  runtimeHarnessIds?: readonly string[] | null;
}): AcpSetupCatalog {
  return resolveSharedAcpSetupCatalog({
    cfg: params.cfg,
    runtimeHarnessIds: params.runtimeHarnessIds,
    registeredBackends: listAcpRuntimeBackendSummaries(),
  });
}

export function resolveAcpBackendCatalogEntriesWithRegistry(): AcpBackendCatalogEntry[] {
  return resolveAcpBackendCatalogEntries(listAcpRuntimeBackendSummaries());
}
