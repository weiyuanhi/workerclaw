// Control UI tests cover channels page ordering and config-only channels.
import { describe, expect, it } from "vitest";
import type { ChannelsProps } from "./channels.types.ts";
import {
  isChannelConfiguredInForm,
  isChannelPresentInSnapshot,
  isWeixinChannelId,
  resolveChannelsPageLabel,
  resolveChannelsPageOrder,
} from "./channels-page-order.ts";

function createProps(overrides: Partial<ChannelsProps> = {}): ChannelsProps {
  return {
    connected: true,
    loading: false,
    snapshot: null,
    lastError: null,
    lastSuccessAt: null,
    whatsappMessage: null,
    whatsappQrDataUrl: null,
    whatsappConnected: null,
    whatsappBusy: false,
    weixinLoginMessage: null,
    weixinLoginQrUrl: null,
    weixinLoginSessionKey: null,
    weixinBusy: false,
    configSchema: null,
    configSchemaLoading: false,
    configForm: null,
    configUiHints: {},
    configSaving: false,
    configFormDirty: false,
    nostrProfileFormState: null,
    nostrProfileAccountId: null,
    onRefresh: () => {},
    onWhatsAppStart: () => {},
    onWhatsAppWait: () => {},
    onWhatsAppLogout: () => {},
    onWeixinStart: () => {},
    onWeixinWait: () => {},
    onConfigPatch: () => {},
    onConfigSave: () => {},
    onConfigReload: () => {},
    onNostrProfileEdit: () => {},
    onNostrProfileCancel: () => {},
    onNostrProfileFieldChange: () => {},
    onNostrProfileSave: () => {},
    onNostrProfileImport: () => {},
    onNostrProfileToggleAdvanced: () => {},
    ...overrides,
  };
}

describe("resolveChannelsPageOrder", () => {
  it("includes configured channels that are missing from the gateway snapshot", () => {
    const props = createProps({
      snapshot: {
        ts: Date.now(),
        channelOrder: ["telegram"],
        channelLabels: { telegram: "Telegram" },
        channels: { telegram: { configured: true } },
        channelAccounts: {},
        channelDefaultAccountId: {},
      },
      configForm: {
        channels: {
          "openclaw-weixin": { enabled: true },
        },
      },
    });

    expect(resolveChannelsPageOrder(props)).toEqual(["telegram", "openclaw-weixin"]);
  });

  it("prefers snapshot order before configured-only channels", () => {
    const props = createProps({
      snapshot: {
        ts: Date.now(),
        channelMeta: [
          { id: "whatsapp", label: "WhatsApp" },
          { id: "telegram", label: "Telegram" },
        ],
        channelOrder: ["whatsapp", "telegram"],
        channelLabels: { whatsapp: "WhatsApp", telegram: "Telegram" },
        channels: {},
        channelAccounts: {},
        channelDefaultAccountId: {},
      },
      configForm: {
        channels: {
          "openclaw-weixin": { enabled: true },
        },
      },
    });

    expect(resolveChannelsPageOrder(props)).toEqual(["whatsapp", "telegram", "openclaw-weixin"]);
  });

  it("skips reserved channels config keys", () => {
    const props = createProps({
      configForm: {
        channels: {
          defaults: { dmPolicy: "pairing" },
          modelByChannel: { telegram: "openai/gpt-5.5" },
          "openclaw-weixin": { enabled: true },
        },
      },
    });

    expect(resolveChannelsPageOrder(props)).toEqual(["openclaw-weixin"]);
  });
});

describe("resolveChannelsPageLabel", () => {
  it("uses config UI hints when the snapshot has no label", () => {
    const props = createProps({
      configUiHints: {
        "channels.openclaw-weixin": { label: "WeChat" },
      },
    });

    expect(resolveChannelsPageLabel("openclaw-weixin", props)).toBe("WeChat");
  });
});

describe("channel presence helpers", () => {
  it("detects configured form channels and weixin ids", () => {
    const props = createProps({
      configForm: {
        channels: {
          "openclaw-weixin": { enabled: true },
        },
      },
    });

    expect(isChannelConfiguredInForm("openclaw-weixin", props)).toBe(true);
    expect(isChannelPresentInSnapshot("openclaw-weixin", props)).toBe(false);
    expect(isWeixinChannelId("openclaw-weixin")).toBe(true);
    expect(isWeixinChannelId("weixin")).toBe(true);
  });
});
