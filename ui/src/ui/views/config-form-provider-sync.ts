import type { ModelCatalogEntry } from "../types.ts";

export function collectChatVisibleProviderIds(
  catalog: ModelCatalogEntry[] | undefined,
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of catalog ?? []) {
    const id = entry.provider?.trim();
    if (!id) {
      continue;
    }
    const key = id.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    ids.push(id);
  }
  return ids.toSorted((left, right) => left.localeCompare(right));
}

export function modelAllowlistKeyMatchesProvider(modelKey: string, providerId: string): boolean {
  const trimmed = modelKey.trim();
  if (!trimmed) {
    return false;
  }
  const slash = trimmed.indexOf("/");
  const provider = slash === -1 ? trimmed : trimmed.slice(0, slash);
  return provider.toLowerCase() === providerId.trim().toLowerCase();
}

export function removeProviderFromAllowlistModels(
  allowlist: Record<string, unknown> | undefined,
  providerId: string,
): Record<string, unknown> | undefined {
  if (!allowlist || typeof allowlist !== "object" || Array.isArray(allowlist)) {
    return allowlist;
  }
  const next: Record<string, unknown> = { ...allowlist };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (modelAllowlistKeyMatchesProvider(key, providerId)) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : allowlist;
}

export function removeProviderFromConfiguredProviders(
  configured: Record<string, unknown> | undefined,
  providerId: string,
): Record<string, unknown> {
  const next = { ...(configured ?? {}) };
  delete next[providerId];
  return next;
}

export type ModelProviderFormRemovalPatch = {
  path: Array<string | number>;
  value: unknown;
};

export function buildModelProviderRemovalFormPatches(
  formValue: Record<string, unknown> | null | undefined,
  providerId: string,
): ModelProviderFormRemovalPatch[] {
  if (!formValue) {
    return [];
  }
  const patches: ModelProviderFormRemovalPatch[] = [];
  const models = formValue.models;
  const providers =
    models && typeof models === "object" && !Array.isArray(models)
      ? (models as { providers?: Record<string, unknown> }).providers
      : undefined;
  if (providers && providerId in providers) {
    patches.push({
      path: ["models", "providers"],
      value: removeProviderFromConfiguredProviders(providers, providerId),
    });
  }

  const agents = formValue.agents;
  const defaults =
    agents && typeof agents === "object" && !Array.isArray(agents)
      ? (agents as { defaults?: { models?: Record<string, unknown> } }).defaults
      : undefined;
  const allowlist = defaults?.models;
  const nextAllowlist = removeProviderFromAllowlistModels(allowlist, providerId);
  if (nextAllowlist !== allowlist) {
    patches.push({
      path: ["agents", "defaults", "models"],
      value: nextAllowlist ?? {},
    });
  }
  return patches;
}
