// Tests scoped web-login channel plugin resolution for external channels.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChannelPlugin: vi.fn(),
  loadChannelSetupPluginRegistrySnapshotForChannel: vi.fn(),
  applyPluginAutoEnable: vi.fn((params: { config: unknown }) => ({ config: params.config })),
}));

vi.mock("../../channels/plugins/index.js", () => ({
  getChannelPlugin: mocks.getChannelPlugin,
}));

vi.mock("../../commands/channel-setup/plugin-install.js", () => ({
  loadChannelSetupPluginRegistrySnapshotForChannel:
    mocks.loadChannelSetupPluginRegistrySnapshotForChannel,
}));

vi.mock("../../config/plugin-auto-enable.js", () => ({
  applyPluginAutoEnable: mocks.applyPluginAutoEnable,
}));

import { resolveWebLoginChannelPlugin } from "./web-login-channel.js";

describe("resolveWebLoginChannelPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to a scoped setup snapshot when the channel is not in the active registry", () => {
    mocks.getChannelPlugin.mockReturnValue(undefined);
    const weixinPlugin = {
      id: "openclaw-weixin",
      gateway: {
        loginWithQrStart: vi.fn(),
      },
    };
    mocks.loadChannelSetupPluginRegistrySnapshotForChannel.mockReturnValue({
      channels: [{ plugin: weixinPlugin }],
    });

    const resolved = resolveWebLoginChannelPlugin({
      channelInput: "openclaw-weixin",
      cfg: {
        channels: {
          "openclaw-weixin": { enabled: true },
        },
      } as never,
    });

    expect(resolved).toBe(weixinPlugin);
    expect(mocks.loadChannelSetupPluginRegistrySnapshotForChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "openclaw-weixin",
      }),
    );
  });
});
