// Merges gateway channel snapshots with configured/schema channels for the Channels page.
import { resolveChannelConfigValue } from "./channel-config-extras.ts";
import { analyzeConfigSchema } from "./config-form.analyze.ts";
import { hintForPath, humanize, schemaType, type JsonSchema } from "./config-form.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";

const CHANNELS_CONFIG_RESERVED_KEYS = new Set(["defaults", "modelByChannel"]);

export function isChannelsConfigSectionKey(key: string): boolean {
  return !CHANNELS_CONFIG_RESERVED_KEYS.has(key);
}

export function isChannelConfiguredInForm(key: string, props: ChannelsProps): boolean {
  const value = resolveChannelConfigValue(props.configForm, key);
  if (!value) {
    return false;
  }
  return Object.keys(value).length > 0;
}

export function isChannelPresentInSnapshot(key: string, props: ChannelsProps): boolean {
  const snapshot = props.snapshot;
  if (!snapshot) {
    return false;
  }
  if (snapshot.channelMeta?.some((entry) => entry.id === key)) {
    return true;
  }
  if (snapshot.channelOrder?.includes(key)) {
    return true;
  }
  if (snapshot.channelAccounts?.[key]?.length) {
    return true;
  }
  return Boolean(snapshot.channels && Object.hasOwn(snapshot.channels, key));
}

function resolveSnapshotChannelOrder(props: ChannelsProps): string[] {
  const snapshot = props.snapshot;
  if (snapshot?.channelMeta?.length) {
    return snapshot.channelMeta.map((entry) => entry.id);
  }
  if (snapshot?.channelOrder?.length) {
    return snapshot.channelOrder;
  }
  return [];
}

function resolveConfiguredChannelIds(props: ChannelsProps): string[] {
  const channels = props.configForm?.channels;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return [];
  }
  return Object.keys(channels as Record<string, unknown>).filter(
    (key) => isChannelsConfigSectionKey(key) && (channels as Record<string, unknown>)[key] != null,
  );
}

function resolveChannelsSchemaNode(schema: unknown): JsonSchema | null {
  const analysis = analyzeConfigSchema(schema);
  const root = analysis.schema;
  if (!root || schemaType(root) !== "object" || !root.properties) {
    return null;
  }
  const channelsNode = root.properties.channels;
  if (!channelsNode || schemaType(channelsNode) !== "object") {
    return null;
  }
  return channelsNode;
}

function resolveSchemaChannelIds(props: ChannelsProps): string[] {
  const channelsNode = resolveChannelsSchemaNode(props.configSchema);
  if (!channelsNode?.properties) {
    return [];
  }
  return Object.keys(channelsNode.properties).filter(isChannelsConfigSectionKey);
}

export function resolveChannelsPageLabel(key: string, props: ChannelsProps): string {
  const meta = props.snapshot?.channelMeta?.find((entry) => entry.id === key);
  if (meta?.label) {
    return meta.label;
  }
  const snapshotLabel = props.snapshot?.channelLabels?.[key];
  if (snapshotLabel) {
    return snapshotLabel;
  }
  const hint = hintForPath(["channels", key], props.configUiHints);
  if (hint?.label) {
    return hint.label;
  }
  const channelsNode = resolveChannelsSchemaNode(props.configSchema);
  const schemaTitle = channelsNode?.properties?.[key]?.title;
  if (schemaTitle) {
    return schemaTitle;
  }
  return humanize(key);
}

function sortChannelIds(ids: readonly string[], props: ChannelsProps): string[] {
  return [...ids].toSorted((left, right) =>
    resolveChannelsPageLabel(left, props).localeCompare(resolveChannelsPageLabel(right, props)),
  );
}

export function resolveChannelsPageOrder(props: ChannelsProps): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const append = (ids: readonly string[]) => {
    for (const id of ids) {
      if (!isChannelsConfigSectionKey(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ordered.push(id);
    }
  };

  append(resolveSnapshotChannelOrder(props));
  append(sortChannelIds(resolveConfiguredChannelIds(props), props));
  append(sortChannelIds(resolveSchemaChannelIds(props), props));

  if (ordered.length > 0) {
    return ordered;
  }

  return ["whatsapp", "telegram", "discord", "googlechat", "slack", "signal", "imessage", "nostr"];
}

export function isWeixinChannelId(channelId: string): boolean {
  const normalized = channelId.trim().toLowerCase();
  return normalized === "openclaw-weixin" || normalized === "weixin";
}
