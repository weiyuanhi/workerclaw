/** Browser-safe ACP setup catalog helpers shared by Control UI and Gateway. */
import { normalizeOptionalLowercaseString } from "@openclaw/normalization-core/string-coerce";

/** Built-in acpx harness aliases documented for OpenClaw ACP spawns. */
export const ACPX_BUILTIN_HARNESS_IDS = [
  "claude",
  "codex",
  "copilot",
  "cursor",
  "droid",
  "gemini",
  "iflow",
  "kilocode",
  "kimi",
  "kiro",
  "openclaw",
  "opencode",
  "qwen",
] as const;

export { CURSOR_API_KEY_ENV, CURSOR_HARNESS_ID } from "./acp-harness-auth-spec.js";

/** Known ACP runtime backend ids shown even before plugin registration completes. */
export const ACP_KNOWN_BACKEND_IDS = ["acpx"] as const;

export type AcpRuntimeBackendSummary = {
  id: string;
  healthy: boolean | null;
};

export type AcpBackendCatalogEntry = {
  id: string;
  registered: boolean;
  healthy: boolean | null;
};

export type AcpHarnessAuthState =
  | "logged_in"
  | "logged_out"
  | "api_key"
  | "missing_cli"
  | "probe_failed"
  | "unsupported";

export type AcpHarnessAuthEntry = {
  harnessId: string;
  state: AcpHarnessAuthState;
  message?: string;
  cliCommand?: string;
  loginCommand?: string;
  envVar?: string;
};

export type AcpSetupCatalog = {
  backends: AcpBackendCatalogEntry[];
  harnessIds: string[];
  harnessAuth?: AcpHarnessAuthEntry[];
};

type AcpxPluginConfigShape = {
  plugins?: {
    entries?: {
      acpx?: {
        config?: {
          agents?: Record<string, unknown>;
        };
      };
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Reads custom harness aliases from acpx plugin config overrides. */
export function resolveAcpxCustomHarnessIds(cfg: AcpxPluginConfigShape | null | undefined): string[] {
  const pluginEntry = cfg?.plugins?.entries?.acpx;
  const pluginConfig = isRecord(pluginEntry?.config) ? pluginEntry.config : null;
  const agents = isRecord(pluginConfig?.agents) ? pluginConfig.agents : null;
  if (!agents) {
    return [];
  }
  return Object.keys(agents)
    .map((key) => normalizeOptionalLowercaseString(key) || key.trim())
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right));
}

/** Merges built-in, config-custom, and optional runtime harness ids in stable order. */
export function mergeAcpHarnessIds(params: {
  cfg?: AcpxPluginConfigShape | null;
  runtimeHarnessIds?: readonly string[] | null;
}): string[] {
  const merged = new Set<string>();
  for (const id of ACPX_BUILTIN_HARNESS_IDS) {
    merged.add(id);
  }
  for (const id of resolveAcpxCustomHarnessIds(params.cfg)) {
    merged.add(id);
  }
  for (const raw of params.runtimeHarnessIds ?? []) {
    const normalized = normalizeOptionalLowercaseString(raw) || raw.trim();
    if (normalized) {
      merged.add(normalized);
    }
  }
  const custom = resolveAcpxCustomHarnessIds(params.cfg);
  const ordered: string[] = [];
  for (const id of ACPX_BUILTIN_HARNESS_IDS) {
    if (merged.has(id)) {
      ordered.push(id);
      merged.delete(id);
    }
  }
  for (const id of custom) {
    if (merged.has(id)) {
      ordered.push(id);
      merged.delete(id);
    }
  }
  ordered.push(...[...merged].toSorted((left, right) => left.localeCompare(right)));
  return ordered;
}

function summarizeKnownBackend(
  id: string,
  registered: AcpRuntimeBackendSummary | undefined,
): AcpBackendCatalogEntry {
  return {
    id,
    registered: Boolean(registered),
    healthy: registered?.healthy ?? null,
  };
}

/** Builds backend catalog entries from optional runtime registration plus known defaults. */
export function resolveAcpBackendCatalogEntries(
  registeredBackends: readonly AcpRuntimeBackendSummary[] = [],
): AcpBackendCatalogEntry[] {
  const registeredById = new Map(registeredBackends.map((entry) => [entry.id, entry]));
  const ids = new Set<string>(ACP_KNOWN_BACKEND_IDS);
  for (const entry of registeredBackends) {
    ids.add(entry.id);
  }
  return [...ids]
    .toSorted((left, right) => left.localeCompare(right))
    .map((id) => summarizeKnownBackend(id, registeredById.get(id)));
}

/** Resolves the ACP setup catalog for Control UI and diagnostics. */
export function resolveAcpSetupCatalog(params: {
  cfg?: AcpxPluginConfigShape | null;
  runtimeHarnessIds?: readonly string[] | null;
  registeredBackends?: readonly AcpRuntimeBackendSummary[];
}): AcpSetupCatalog {
  return {
    backends: resolveAcpBackendCatalogEntries(params.registeredBackends ?? []),
    harnessIds: mergeAcpHarnessIds(params),
  };
}

/** Suggests default backend when config leaves the field empty. */
export function resolveSuggestedAcpBackendId(catalog: AcpSetupCatalog): string | null {
  const healthyRegistered = catalog.backends.filter(
    (entry) => entry.registered && entry.healthy !== false,
  );
  if (healthyRegistered.length === 1) {
    return healthyRegistered[0]?.id ?? null;
  }
  const registered = catalog.backends.filter((entry) => entry.registered);
  if (registered.length === 1) {
    return registered[0]?.id ?? null;
  }
  const known = catalog.backends.find((entry) => entry.id === "acpx");
  return known?.id ?? catalog.backends[0]?.id ?? null;
}

export function mergeAcpCatalogEntries(params: {
  remote: AcpSetupCatalog | null | undefined;
  cfg?: AcpxPluginConfigShape | null;
}): AcpSetupCatalog {
  const local = resolveAcpSetupCatalog({ cfg: params.cfg });
  if (!params.remote) {
    return local;
  }
  const backendIds = new Set<string>();
  for (const entry of [...params.remote.backends, ...local.backends]) {
    backendIds.add(entry.id);
  }
  const backends = [...backendIds]
    .toSorted((left, right) => left.localeCompare(right))
    .map(
      (id) =>
        params.remote?.backends.find((entry) => entry.id === id) ??
        local.backends.find((entry) => entry.id === id) ?? {
          id,
          registered: false,
          healthy: null,
        },
    );
  return {
    backends,
    harnessIds: mergeAcpHarnessIds({
      cfg: params.cfg,
      runtimeHarnessIds: params.remote.harnessIds,
    }),
    harnessAuth: params.remote.harnessAuth,
  };
}
