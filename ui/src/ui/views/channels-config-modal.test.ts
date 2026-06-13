// Control UI tests cover channel config edit modal state.
import { describe, expect, it, vi } from "vitest";
import {
  cancelChannelConfigModal,
  getChannelConfigModalState,
  openChannelConfigModal,
  resetChannelConfigModalForTests,
  submitChannelConfigModal,
} from "./channels-config-modal.ts";

describe("channel config modal", () => {
  it("opens, applies draft changes, and closes on submit", () => {
    resetChannelConfigModalForTests();
    const onPatch = vi.fn();
    const onRequestUpdate = vi.fn();

    openChannelConfigModal({
      channelId: "whatsapp",
      channelLabel: "WhatsApp",
      configValue: {
        channels: {
          whatsapp: {
            dmPolicy: "pairing",
            allowFrom: ["+15551234567"],
          },
        },
      },
      schema: null,
      uiHints: {},
      disabled: false,
      onPatch,
    });

    const state = getChannelConfigModalState();
    expect(state.open).toBe(true);
    expect(state.channelId).toBe("whatsapp");
    expect(state.draftEntry.dmPolicy).toBe("pairing");

    state.draftEntry.dmPolicy = "allowlist";
    submitChannelConfigModal();

    expect(onPatch).toHaveBeenCalledWith(["channels", "whatsapp"], {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    });
    expect(getChannelConfigModalState().open).toBe(false);
  });

  it("discards draft changes on cancel", () => {
    resetChannelConfigModalForTests();
    const onPatch = vi.fn();

    openChannelConfigModal({
      channelId: "telegram",
      channelLabel: "Telegram",
      configValue: {
        channels: {
          telegram: { enabled: true },
        },
      },
      schema: null,
      uiHints: {},
      disabled: false,
      onPatch,
    });

    getChannelConfigModalState().draftEntry.enabled = false;
    cancelChannelConfigModal();

    expect(onPatch).not.toHaveBeenCalled();
    expect(getChannelConfigModalState().open).toBe(false);
  });
});
