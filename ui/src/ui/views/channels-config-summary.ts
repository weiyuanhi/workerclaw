// Summarizes channel config for list rows on the Channels page.
import { t } from "../../i18n/index.ts";
import type { ConfigUiHints } from "../types.ts";
import { resolveChannelConfigValue } from "./channel-config-extras.ts";
import { hintForPath, humanize, isSensitiveConfigPath } from "./config-form.shared.ts";

export type ChannelConfigSummaryRow = {
  key: string;
  label: string;
  value: string;
};

const SUMMARY_FIELD_PRIORITY = [
  "enabled",
  "dmPolicy",
  "groupPolicy",
  "allowFrom",
  "groupAllowFrom",
  "defaultAccount",
  "accounts",
  "selfChatMode",
  "streamMode",
  "mode",
  "name",
] as const;

const MAX_SUMMARY_ROWS = 6;

function resolveSummaryLabel(
  channelId: string,
  fieldKey: string,
  hints: ConfigUiHints,
): string {
  const hint = hintForPath(["channels", channelId, fieldKey], hints);
  if (hint?.label) {
    return hint.label;
  }
  const localizedKey = `channels.config.summaryFields.${fieldKey}`;
  const localized = t(localizedKey);
  if (localized !== localizedKey) {
    return localized;
  }
  return humanize(fieldKey);
}

function formatSummaryValue(fieldKey: string, raw: unknown): string | null {
  if (raw == null) {
    return null;
  }
  const path = `channels.${fieldKey}`;
  if (isSensitiveConfigPath(path) || isSensitiveConfigPath(fieldKey)) {
    if (typeof raw === "string") {
      return raw.trim() ? t("channels.config.summaryConfigured") : t("channels.config.summaryNotSet");
    }
    return t("channels.config.summaryConfigured");
  }
  if (typeof raw === "boolean") {
    return raw ? t("common.yes") : t("common.no");
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const text = String(raw).trim();
    return text || null;
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return t("channels.config.summaryEmptyList");
    }
    if (fieldKey === "allowFrom" || fieldKey === "groupAllowFrom") {
      return t("channels.config.summaryAllowFromCount", { count: String(raw.length) });
    }
    return t("channels.config.summaryListCount", { count: String(raw.length) });
  }
  if (typeof raw === "object") {
    if (fieldKey === "accounts") {
      const count = Object.keys(raw as Record<string, unknown>).length;
      return count === 0
        ? t("channels.config.summaryEmptyList")
        : t("channels.config.summaryAccountCount", { count: String(count) });
    }
    const count = Object.keys(raw as Record<string, unknown>).length;
    return count === 0
      ? t("channels.config.summaryEmptyList")
      : t("channels.config.summaryObjectCount", { count: String(count) });
  }
  return String(raw);
}

function resolveSummaryFieldKeys(
  value: Record<string, unknown>,
  priority: readonly string[],
): string[] {
  const keys = new Set<string>();
  for (const field of priority) {
    if (field in value) {
      keys.add(field);
    }
  }
  for (const field of Object.keys(value).toSorted()) {
    keys.add(field);
  }
  return [...keys];
}

export function buildChannelConfigSummaryRows(params: {
  channelId: string;
  configForm: Record<string, unknown> | null | undefined;
  hints: ConfigUiHints;
}): ChannelConfigSummaryRow[] {
  const value = resolveChannelConfigValue(params.configForm, params.channelId);
  if (!value || Object.keys(value).length === 0) {
    return [];
  }

  const rows: ChannelConfigSummaryRow[] = [];
  for (const fieldKey of resolveSummaryFieldKeys(value, SUMMARY_FIELD_PRIORITY)) {
    if (rows.length >= MAX_SUMMARY_ROWS) {
      break;
    }
    const formatted = formatSummaryValue(fieldKey, value[fieldKey]);
    if (formatted == null) {
      continue;
    }
    rows.push({
      key: fieldKey,
      label: resolveSummaryLabel(params.channelId, fieldKey, params.hints),
      value: formatted,
    });
  }
  return rows;
}
