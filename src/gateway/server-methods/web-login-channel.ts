// Resolves channel plugins that expose gateway QR-login hooks for web.login.* RPCs.
import { loadChannelSetupPluginRegistrySnapshotForChannel } from "../../commands/channel-setup/plugin-install.js";
import { normalizeAnyChannelId } from "../../channels/registry.js";
import { getChannelPlugin } from "../../channels/plugins/index.js";
import type { ChannelPlugin } from "../../channels/plugins/types.plugin.js";
import type { ChannelId } from "../../channels/plugins/types.public.js";
import { applyPluginAutoEnable } from "../../config/plugin-auto-enable.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { defaultRuntime } from "../../runtime.js";

function pluginSupportsWebLogin(plugin: ChannelPlugin | undefined): plugin is ChannelPlugin {
  return Boolean(plugin?.gateway?.loginWithQrStart || plugin?.gateway?.loginWithQrWait);
}

function resolveWebLoginChannelId(channelInput: string): ChannelId | null {
  const trimmed = channelInput.trim();
  if (!trimmed) {
    return null;
  }
  return normalizeAnyChannelId(trimmed) ?? (trimmed as ChannelId);
}

function findWebLoginPluginInSnapshot(
  snapshot: ReturnType<typeof loadChannelSetupPluginRegistrySnapshotForChannel>,
  channelId: ChannelId,
): ChannelPlugin | null {
  for (const entry of snapshot.channels) {
    const plugin = entry.plugin;
    if (!pluginSupportsWebLogin(plugin)) {
      continue;
    }
    if (plugin.id === channelId) {
      return plugin;
    }
  }
  const fallback = snapshot.channels.find((entry) => pluginSupportsWebLogin(entry.plugin))?.plugin;
  return pluginSupportsWebLogin(fallback) ? fallback : null;
}

/** Resolve a QR-login-capable channel plugin from the active registry or a scoped setup load. */
export function resolveWebLoginChannelPlugin(params: {
  channelInput: string;
  cfg: OpenClawConfig;
}): ChannelPlugin | null {
  const channelId = resolveWebLoginChannelId(params.channelInput);
  if (!channelId) {
    return null;
  }

  const loaded = getChannelPlugin(channelId);
  if (pluginSupportsWebLogin(loaded)) {
    return loaded;
  }

  const autoEnabled = applyPluginAutoEnable({ config: params.cfg, env: process.env });
  const snapshot = loadChannelSetupPluginRegistrySnapshotForChannel({
    cfg: autoEnabled.config,
    runtime: defaultRuntime,
    channel: channelId,
  });
  return findWebLoginPluginInSnapshot(snapshot, channelId);
}

export function buildWebLoginUnsupportedMessage(params: {
  channelInput: string;
  cfg: OpenClawConfig;
}): string {
  const channelId = resolveWebLoginChannelId(params.channelInput) ?? params.channelInput.trim();
  const pluginId = channelId || params.channelInput.trim();
  const entry =
    params.cfg.plugins?.entries?.[pluginId] ??
    (pluginId !== channelId && channelId
      ? params.cfg.plugins?.entries?.[channelId]
      : undefined);
  if (entry?.enabled === false) {
    return `web login is not supported for channel ${params.channelInput}. Enable plugins.entries.${pluginId}.enabled, then restart the gateway.`;
  }
  return `web login is not supported for channel ${params.channelInput}. Install and enable @tencent-weixin/openclaw-weixin, then restart the gateway.`;
}
