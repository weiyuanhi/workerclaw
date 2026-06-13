// Dreaming settings helpers shared by the Dreams header modal and config patch writer.
import { resolveConfiguredDreaming } from "./controllers/dreaming.ts";

export const DEFAULT_DREAMING_FREQUENCY = "0 3 * * *";
export const DEFAULT_DREAMING_MAX_PROMOTED_SNIPPET_TOKENS = 160;

export type DreamingFrequencyPreset = "daily" | "every6h" | "every12h" | "custom";

export type DreamingSettingsDraft = {
  enabled: boolean;
  frequency: string;
  frequencyPreset: DreamingFrequencyPreset;
  timezone: string;
  model: string;
  maxPromotedSnippetTokens: number;
  phases: {
    light: boolean;
    rem: boolean;
    deep: boolean;
  };
};

export const DREAMING_FREQUENCY_PRESETS: Record<
  Exclude<DreamingFrequencyPreset, "custom">,
  string
> = {
  daily: "0 3 * * *",
  every6h: "0 */6 * * *",
  every12h: "0 */12 * * *",
};

export const DREAMING_TIMEZONE_OPTIONS = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

export function resolveDreamingTimezoneOptions(params: {
  current?: string;
  localTimezone?: string;
}): string[] {
  return uniquePreserveOrder([
    ...(params.localTimezone ? [params.localTimezone] : []),
    ...DREAMING_TIMEZONE_OPTIONS,
    ...(params.current ? [params.current] : []),
  ]);
}

export function resolveBrowserTimezone(): string | undefined {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    return timezone || undefined;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeFiniteInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function resolveDreamingFrequencyPreset(frequency: string): DreamingFrequencyPreset {
  const normalized = frequency.trim();
  for (const [preset, cron] of Object.entries(DREAMING_FREQUENCY_PRESETS)) {
    if (normalized === cron) {
      return preset as Exclude<DreamingFrequencyPreset, "custom">;
    }
  }
  return "custom";
}

export function resolveDreamingFrequencyFromPreset(preset: DreamingFrequencyPreset, custom: string): string {
  if (preset === "custom") {
    return custom.trim() || DEFAULT_DREAMING_FREQUENCY;
  }
  return DREAMING_FREQUENCY_PRESETS[preset];
}

export function createDefaultDreamingSettingsDraft(
  overrides?: Partial<DreamingSettingsDraft>,
): DreamingSettingsDraft {
  return {
    enabled: false,
    frequency: DEFAULT_DREAMING_FREQUENCY,
    frequencyPreset: "daily",
    timezone: "",
    model: "",
    maxPromotedSnippetTokens: DEFAULT_DREAMING_MAX_PROMOTED_SNIPPET_TOKENS,
    phases: {
      light: true,
      rem: true,
      deep: true,
    },
    ...overrides,
  };
}

export function resolveDreamingSettingsFromConfig(
  configValue: Record<string, unknown> | null,
): DreamingSettingsDraft {
  const { pluginId, enabled } = resolveConfiguredDreaming(configValue);
  const plugins = asRecord(configValue?.plugins);
  const entries = asRecord(plugins?.entries);
  const pluginEntry = asRecord(entries?.[pluginId]);
  const config = asRecord(pluginEntry?.config);
  const dreaming = asRecord(config?.dreaming);
  const phases = asRecord(dreaming?.phases);
  const light = asRecord(phases?.light);
  const rem = asRecord(phases?.rem);
  const deep = asRecord(phases?.deep);
  const frequency = normalizeTrimmedString(dreaming?.frequency) ?? DEFAULT_DREAMING_FREQUENCY;

  return {
    enabled,
    frequency,
    frequencyPreset: resolveDreamingFrequencyPreset(frequency),
    timezone: normalizeTrimmedString(dreaming?.timezone) ?? "",
    model: normalizeTrimmedString(dreaming?.model) ?? "",
    maxPromotedSnippetTokens: normalizeFiniteInt(
      deep?.maxPromotedSnippetTokens,
      DEFAULT_DREAMING_MAX_PROMOTED_SNIPPET_TOKENS,
    ),
    phases: {
      light: normalizeBoolean(light?.enabled, true),
      rem: normalizeBoolean(rem?.enabled, true),
      deep: normalizeBoolean(deep?.enabled, true),
    },
  };
}

export function buildDreamingConfigPayload(draft: DreamingSettingsDraft): Record<string, unknown> {
  const frequency = resolveDreamingFrequencyFromPreset(draft.frequencyPreset, draft.frequency);
  const payload: Record<string, unknown> = {
    enabled: draft.enabled,
    frequency,
    phases: {
      light: { enabled: draft.phases.light },
      rem: { enabled: draft.phases.rem },
      deep: {
        enabled: draft.phases.deep,
        maxPromotedSnippetTokens: Math.max(1, draft.maxPromotedSnippetTokens),
      },
    },
  };
  const timezone = draft.timezone.trim();
  if (timezone) {
    payload.timezone = timezone;
  }
  const model = draft.model.trim();
  if (model) {
    payload.model = model;
  }
  return payload;
}

export function buildDreamingSettingsPatch(
  pluginId: string,
  draft: DreamingSettingsDraft,
): Record<string, unknown> {
  return {
    plugins: {
      entries: {
        [pluginId]: {
          config: {
            dreaming: buildDreamingConfigPayload(draft),
          },
        },
      },
    },
  };
}
