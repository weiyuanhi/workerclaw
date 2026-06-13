// Curated quick-add presets for models.providers create modal.
export type ModelProviderCreateKind = "cloud" | "local" | "custom";

export type CloudModelProviderPreset = {
  id: string;
  labelKey: string;
};

export type LocalModelProviderPreset = {
  id: string;
  labelKey: string;
  baseUrl: string;
  api?: string;
  modelPlaceholderKey: string;
};

export const MODEL_PROVIDER_CREATE_KINDS = [
  "cloud",
  "local",
  "custom",
] as const satisfies readonly ModelProviderCreateKind[];

/** Popular bundled cloud providers for API-key quick setup overlays. */
export const CLOUD_MODEL_PROVIDER_PRESETS: readonly CloudModelProviderPreset[] = [
  { id: "openai", labelKey: "configPage.modelsProviderModal.cloudProviders.openai" },
  { id: "anthropic", labelKey: "configPage.modelsProviderModal.cloudProviders.anthropic" },
  { id: "google", labelKey: "configPage.modelsProviderModal.cloudProviders.google" },
  { id: "groq", labelKey: "configPage.modelsProviderModal.cloudProviders.groq" },
  { id: "deepseek", labelKey: "configPage.modelsProviderModal.cloudProviders.deepseek" },
  { id: "openrouter", labelKey: "configPage.modelsProviderModal.cloudProviders.openrouter" },
  { id: "mistral", labelKey: "configPage.modelsProviderModal.cloudProviders.mistral" },
  { id: "xai", labelKey: "configPage.modelsProviderModal.cloudProviders.xai" },
  { id: "moonshot", labelKey: "configPage.modelsProviderModal.cloudProviders.moonshot" },
  { id: "qwen", labelKey: "configPage.modelsProviderModal.cloudProviders.qwen" },
  { id: "dashscope", labelKey: "configPage.modelsProviderModal.cloudProviders.dashscope" },
  { id: "zai", labelKey: "configPage.modelsProviderModal.cloudProviders.zai" },
  { id: "volcengine", labelKey: "configPage.modelsProviderModal.cloudProviders.volcengine" },
  { id: "byteplus", labelKey: "configPage.modelsProviderModal.cloudProviders.byteplus" },
  { id: "cerebras", labelKey: "configPage.modelsProviderModal.cloudProviders.cerebras" },
  { id: "fireworks", labelKey: "configPage.modelsProviderModal.cloudProviders.fireworks" },
  { id: "together", labelKey: "configPage.modelsProviderModal.cloudProviders.together" },
  { id: "minimax", labelKey: "configPage.modelsProviderModal.cloudProviders.minimax" },
];

export const LOCAL_MODEL_PROVIDER_PRESETS: readonly LocalModelProviderPreset[] = [
  {
    id: "ollama",
    labelKey: "configPage.modelsProviderModal.localProviders.ollama",
    baseUrl: "http://127.0.0.1:11434",
    modelPlaceholderKey: "configPage.modelsProviderModal.localModelPlaceholders.ollama",
  },
  {
    id: "lmstudio",
    labelKey: "configPage.modelsProviderModal.localProviders.lmstudio",
    baseUrl: "http://localhost:1234/v1",
    api: "openai-completions",
    modelPlaceholderKey: "configPage.modelsProviderModal.localModelPlaceholders.lmstudio",
  },
  {
    id: "vllm",
    labelKey: "configPage.modelsProviderModal.localProviders.vllm",
    baseUrl: "http://127.0.0.1:8000/v1",
    api: "openai-completions",
    modelPlaceholderKey: "configPage.modelsProviderModal.localModelPlaceholders.vllm",
  },
  {
    id: "sglang",
    labelKey: "configPage.modelsProviderModal.localProviders.sglang",
    baseUrl: "http://127.0.0.1:30000/v1",
    api: "openai-completions",
    modelPlaceholderKey: "configPage.modelsProviderModal.localModelPlaceholders.sglang",
  },
];

const BUILT_IN_OVERLAY_PROVIDER_IDS = new Set<string>([
  ...CLOUD_MODEL_PROVIDER_PRESETS.map((preset) => preset.id),
  ...LOCAL_MODEL_PROVIDER_PRESETS.map((preset) => preset.id),
]);

export function isBuiltInModelProviderOverlayId(providerId: string): boolean {
  return BUILT_IN_OVERLAY_PROVIDER_IDS.has(providerId.trim());
}

export function resolveCloudModelProviderPreset(
  presetId: string,
): CloudModelProviderPreset | undefined {
  return CLOUD_MODEL_PROVIDER_PRESETS.find((preset) => preset.id === presetId);
}

export function resolveLocalModelProviderPreset(
  presetId: string,
): LocalModelProviderPreset | undefined {
  return LOCAL_MODEL_PROVIDER_PRESETS.find((preset) => preset.id === presetId);
}

export function resolveFirstAvailableCloudPresetId(
  existing: Record<string, unknown>,
): string | null {
  for (const preset of CLOUD_MODEL_PROVIDER_PRESETS) {
    if (!(preset.id in existing)) {
      return preset.id;
    }
  }
  return null;
}

export function resolveFirstAvailableLocalPresetId(
  existing: Record<string, unknown>,
): string | null {
  for (const preset of LOCAL_MODEL_PROVIDER_PRESETS) {
    if (!(preset.id in existing)) {
      return preset.id;
    }
  }
  return null;
}

export function buildCloudProviderDraftEntry(
  draftEntry: Record<string, unknown>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  const apiKey = draftEntry.apiKey;
  if (typeof apiKey === "string" && apiKey.trim()) {
    entry.apiKey = apiKey.trim();
  }
  return entry;
}

export function buildLocalProviderDraftEntry(
  preset: LocalModelProviderPreset,
  draftEntry: Record<string, unknown>,
  modelId: string,
): Record<string, unknown> {
  const trimmedModelId = modelId.trim();
  const entry: Record<string, unknown> = {
    baseUrl:
      typeof draftEntry.baseUrl === "string" && draftEntry.baseUrl.trim()
        ? draftEntry.baseUrl.trim()
        : preset.baseUrl,
    models: trimmedModelId ? [{ id: trimmedModelId, name: trimmedModelId }] : [],
  };
  if (preset.api) {
    entry.api = preset.api;
  }
  const apiKey = draftEntry.apiKey;
  if (typeof apiKey === "string" && apiKey.trim()) {
    entry.apiKey = apiKey.trim();
  }
  return normalizeQuickProviderDraftEntry(entry);
}

export function normalizeQuickProviderDraftEntry(
  draftEntry: Record<string, unknown>,
): Record<string, unknown> {
  const entry = { ...draftEntry };
  if (!Array.isArray(entry.models)) {
    entry.models = [];
  }
  return entry;
}

export function createLocalProviderDraftFromPreset(
  preset: LocalModelProviderPreset,
): Record<string, unknown> {
  const draft: Record<string, unknown> = {
    baseUrl: preset.baseUrl,
    models: [],
  };
  if (preset.api) {
    draft.api = preset.api;
  }
  return draft;
}

export function inferModelProviderKind(
  providerId: string,
  entry: Record<string, unknown>,
): ModelProviderCreateKind {
  if (resolveLocalModelProviderPreset(providerId)) {
    return "local";
  }
  if (resolveCloudModelProviderPreset(providerId)) {
    return "cloud";
  }
  if (typeof entry.baseUrl === "string" && entry.baseUrl.trim()) {
    return "custom";
  }
  if (Array.isArray(entry.models) && entry.models.length > 0) {
    return "custom";
  }
  if (typeof entry.api === "string" && entry.api.trim()) {
    return "custom";
  }
  if (typeof entry.apiKey === "string" || Object.keys(entry).length === 0) {
    return "cloud";
  }
  return "custom";
}

export function resolveFirstModelIdFromProviderEntry(
  entry: Record<string, unknown>,
): string {
  const models = entry.models;
  if (!Array.isArray(models) || models.length === 0) {
    return "";
  }
  const first = models[0];
  if (typeof first === "string") {
    return first.trim();
  }
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const id = (first as { id?: unknown }).id;
    if (typeof id === "string") {
      return id.trim();
    }
  }
  return "";
}

export function seedProviderEditDraft(
  providerId: string,
  entry: Record<string, unknown>,
): { kind: ModelProviderCreateKind; draftEntry: Record<string, unknown>; quickModelId: string } {
  const kind = inferModelProviderKind(providerId, entry);
  const draftEntry = normalizeQuickProviderDraftEntry(
    Object.keys(entry).length > 0 ? { ...entry } : createInitialDraftForKind(providerId, kind),
  );
  if (kind === "local") {
    const preset = resolveLocalModelProviderPreset(providerId);
    if (preset && !resolveModelProviderDraftBaseUrl(draftEntry)) {
      draftEntry.baseUrl = preset.baseUrl;
    }
    if (preset?.api && typeof draftEntry.api !== "string") {
      draftEntry.api = preset.api;
    }
  }
  return {
    kind,
    draftEntry,
    quickModelId: resolveFirstModelIdFromProviderEntry(draftEntry),
  };
}

function createInitialDraftForKind(
  providerId: string,
  kind: ModelProviderCreateKind,
): Record<string, unknown> {
  if (kind === "local") {
    const preset = resolveLocalModelProviderPreset(providerId);
    if (preset) {
      return createLocalProviderDraftFromPreset(preset);
    }
  }
  return { models: [] };
}

function resolveModelProviderDraftBaseUrl(entry: Record<string, unknown>): string | null {
  const baseUrl = entry.baseUrl;
  if (typeof baseUrl !== "string") {
    return null;
  }
  const trimmed = baseUrl.trim();
  return trimmed || null;
}
