// Control UI module implements thinking labels behavior.
import { t } from "../i18n/index.ts";
import { normalizeLowercaseStringOrEmpty } from "./string-coerce.ts";
import { normalizeThinkLevel } from "./thinking.ts";

export function normalizeThinkingOptionValue(raw: string): string {
  return normalizeThinkLevel(raw) ?? normalizeLowercaseStringOrEmpty(raw);
}

export function formatInheritedThinkingLabel(effectiveLevel: string | null | undefined): string {
  const normalized = effectiveLevel ? normalizeThinkingOptionValue(effectiveLevel) : "off";
  return t("modelPicker.inheritedThinking", {
    level: formatThinkingLevelDisplayLabel(normalized),
  });
}

export function formatThinkingOverrideLabel(value: string, label?: string | null): string {
  const normalized = normalizeThinkingOptionValue(value);
  if (!normalized || normalized === "off") {
    return t("modelPicker.thinking.off");
  }
  return formatThinkingLevelDisplayLabel(label?.trim() || normalized);
}

export function formatThinkingLevelDisplayLabel(value: string): string {
  const raw = normalizeLowercaseStringOrEmpty(value);
  if (["on", "enable", "enabled"].includes(raw)) {
    return t("modelPicker.thinking.on");
  }
  const normalized = normalizeThinkingOptionValue(value);
  const key = `modelPicker.thinking.${normalized}`;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
