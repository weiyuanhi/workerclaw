// Resolves localized config form labels/help for infrastructure, automation, and AI settings sections.
import type { Locale } from "./lib/types.ts";
import { i18n } from "./lib/translate.ts";
import {
  CONFIG_HINTS_BY_LOCALE,
  CONFIG_HINTS_EN,
  translateConfigHintZh,
  type ConfigHintMaps,
} from "./generated/config-hints.ts";

const SECTION_PREFIXES = [
  "agents",
  "models",
  "skills",
  "tools",
  "memory",
  "session",
  "plugins",
  "acp",
  "commands",
  "hooks",
  "bindings",
  "cron",
  "approvals",
  "gateway",
  "web",
  "browser",
  "nodeHost",
  "discovery",
  "media",
  "mcp",
];

function isLocalizableConfigHintPath(path: string): boolean {
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
  if (!fallback || !isLocalizableConfigHintPath(path)) {
    return fallback;
  }
  const locale = i18n.getLocale();
  const localized = resolveHintMaps(locale)?.[kind]?.[path];
  if (localized) {
    return localized;
  }
  if (locale !== "en") {
    const enLocalized = CONFIG_HINTS_EN[kind][path];
    if (enLocalized) {
      return locale === "zh-CN" ? translateConfigHintZh(enLocalized) : enLocalized;
    }
    if (locale === "zh-CN") {
      return translateConfigHintZh(fallback);
    }
    return fallback;
  }
  return fallback;
}
