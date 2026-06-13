// Resolves localized config form labels/help for AI & Agents settings sections.
import type { Locale } from "./lib/types.ts";
import { i18n } from "./lib/translate.ts";
import { CONFIG_HINTS_BY_LOCALE, CONFIG_HINTS_EN, type ConfigHintMaps } from "./generated/config-hints.ts";

const SECTION_PREFIXES = ["agents", "models", "skills", "tools", "memory", "session"];

function isAiAgentsHintPath(path: string): boolean {
  return SECTION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}.`));
}

function resolveHintMaps(locale: Locale): ConfigHintMaps | undefined {
  return CONFIG_HINTS_BY_LOCALE[locale] ?? (locale === "en" ? CONFIG_HINTS_EN : undefined);
}

export function localizeConfigHint(
  path: string,
  kind: keyof ConfigHintMaps,
  fallback: string | undefined,
): string | undefined {
  if (!fallback || !isAiAgentsHintPath(path)) {
    return fallback;
  }
  const locale = i18n.getLocale();
  const localized = resolveHintMaps(locale)?.[kind]?.[path];
  if (localized) {
    return localized;
  }
  if (locale !== "en") {
    return CONFIG_HINTS_EN[kind][path] ?? fallback;
  }
  return fallback;
}
