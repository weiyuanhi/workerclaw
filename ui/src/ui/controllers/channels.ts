// Control UI controller manages channels gateway state.
import type { ChannelsStatusSnapshot } from "../types.ts";
import type { ChannelsState } from "./channels.types.ts";
import {
  formatMissingOperatorReadScopeMessage,
  isMissingOperatorReadScopeError,
} from "./scope-errors.ts";

export type { ChannelsState };

type LoadChannelsOptions = {
  softTimeoutMs?: number;
};

function delay(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("timeout"), ms);
  });
}

export async function loadChannels(
  state: ChannelsState,
  probe: boolean,
  options: LoadChannelsOptions = {},
) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.channelsLoading && (!state.channelsLoadingProbe || probe)) {
    return;
  }
  const refreshSeq = (state.channelsRefreshSeq ?? 0) + 1;
  state.channelsRefreshSeq = refreshSeq;
  state.channelsLoading = true;
  state.channelsLoadingProbe = probe;
  state.channelsError = null;
  const refresh = (async () => {
    try {
      const res = await state.client!.request<ChannelsStatusSnapshot | null>("channels.status", {
        probe,
        timeoutMs: 8000,
      });
      if (state.channelsRefreshSeq !== refreshSeq) {
        return;
      }
      state.channelsSnapshot = res;
      state.channelsLastSuccess = Date.now();
    } catch (err) {
      if (state.channelsRefreshSeq !== refreshSeq) {
        return;
      }
      if (isMissingOperatorReadScopeError(err)) {
        state.channelsSnapshot = null;
        state.channelsError = formatMissingOperatorReadScopeMessage("channel status");
      } else {
        state.channelsError = String(err);
      }
    } finally {
      if (state.channelsRefreshSeq === refreshSeq) {
        state.channelsLoading = false;
        state.channelsLoadingProbe = null;
      }
    }
  })();

  const softTimeoutMs = options.softTimeoutMs;
  if (typeof softTimeoutMs === "number" && softTimeoutMs > 0) {
    const outcome = await Promise.race([refresh.then(() => "done" as const), delay(softTimeoutMs)]);
    if (outcome === "timeout") {
      return;
    }
    return;
  }
  await refresh;
}

export const WEIXIN_CHANNEL_ID = "openclaw-weixin";
/** Matches `web.login.wait` timeout for WeChat QR login in the Control UI. */
export const WEIXIN_LOGIN_WAIT_TIMEOUT_MS = 120_000;

export function shouldAutoWaitWeixinLogin(state: ChannelsState): boolean {
  return Boolean(state.weixinLoginQrUrl && state.weixinLoginSessionKey);
}

export async function startWeixinLogin(state: ChannelsState, force: boolean) {
  if (!state.client || !state.connected || state.weixinBusy) {
    return;
  }
  state.weixinBusy = true;
  try {
    const res = await state.client.request<{
      message?: string;
      qrDataUrl?: string;
      connected?: boolean;
      sessionKey?: string;
    }>("web.login.start", {
      channel: WEIXIN_CHANNEL_ID,
      force,
      timeoutMs: 30000,
    });
    state.weixinLoginMessage = res.message ?? null;
    state.weixinLoginQrUrl = res.qrDataUrl ?? null;
    state.weixinLoginSessionKey =
      typeof res.sessionKey === "string" ? res.sessionKey : state.weixinLoginSessionKey;
    if (res.connected) {
      state.weixinLoginQrUrl = null;
      state.weixinLoginSessionKey = null;
    }
  } catch (err) {
    state.weixinLoginMessage = String(err);
    state.weixinLoginQrUrl = null;
    state.weixinLoginSessionKey = null;
  } finally {
    state.weixinBusy = false;
  }
}

export async function waitWeixinLogin(state: ChannelsState) {
  if (!state.client || !state.connected || state.weixinBusy) {
    return;
  }
  state.weixinBusy = true;
  try {
    const res = await state.client.request<{
      message?: string;
      connected?: boolean;
      qrDataUrl?: string;
      sessionKey?: string;
    }>("web.login.wait", {
      channel: WEIXIN_CHANNEL_ID,
      timeoutMs: WEIXIN_LOGIN_WAIT_TIMEOUT_MS,
      sessionKey: state.weixinLoginSessionKey ?? undefined,
    });
    state.weixinLoginMessage = res.message ?? null;
    if (res.qrDataUrl) {
      state.weixinLoginQrUrl = res.qrDataUrl;
    } else if (res.connected) {
      state.weixinLoginQrUrl = null;
      state.weixinLoginSessionKey = null;
    }
    if (typeof res.sessionKey === "string") {
      state.weixinLoginSessionKey = res.sessionKey;
    }
  } catch (err) {
    state.weixinLoginMessage = String(err);
  } finally {
    state.weixinBusy = false;
  }
}

/** Shows a WeChat QR code and waits for phone confirmation in one uninterrupted flow. */
export async function runWeixinLoginFlow(state: ChannelsState, force: boolean) {
  if (!state.client || !state.connected || state.weixinBusy) {
    return;
  }
  state.weixinBusy = true;
  try {
    const start = await state.client.request<{
      message?: string;
      qrDataUrl?: string;
      connected?: boolean;
      sessionKey?: string;
    }>("web.login.start", {
      channel: WEIXIN_CHANNEL_ID,
      force,
      timeoutMs: 30000,
    });
    state.weixinLoginMessage = start.message ?? null;
    state.weixinLoginQrUrl = start.qrDataUrl ?? null;
    state.weixinLoginSessionKey =
      typeof start.sessionKey === "string" ? start.sessionKey : state.weixinLoginSessionKey;
    if (start.connected) {
      state.weixinLoginQrUrl = null;
      state.weixinLoginSessionKey = null;
      return;
    }
    if (!shouldAutoWaitWeixinLogin(state)) {
      return;
    }
    const wait = await state.client.request<{
      message?: string;
      connected?: boolean;
      qrDataUrl?: string;
      sessionKey?: string;
    }>("web.login.wait", {
      channel: WEIXIN_CHANNEL_ID,
      timeoutMs: WEIXIN_LOGIN_WAIT_TIMEOUT_MS,
      sessionKey: state.weixinLoginSessionKey ?? undefined,
    });
    state.weixinLoginMessage = wait.message ?? null;
    if (wait.qrDataUrl) {
      state.weixinLoginQrUrl = wait.qrDataUrl;
    } else if (wait.connected) {
      state.weixinLoginQrUrl = null;
      state.weixinLoginSessionKey = null;
    }
    if (typeof wait.sessionKey === "string") {
      state.weixinLoginSessionKey = wait.sessionKey;
    }
  } catch (err) {
    state.weixinLoginMessage = String(err);
  } finally {
    state.weixinBusy = false;
  }
}

export async function startWhatsAppLogin(state: ChannelsState, force: boolean) {
  if (!state.client || !state.connected || state.whatsappBusy) {
    return;
  }
  state.whatsappBusy = true;
  try {
    const res = await state.client.request<{
      message?: string;
      qrDataUrl?: string;
      connected?: boolean;
    }>("web.login.start", {
      force,
      timeoutMs: 30000,
    });
    state.whatsappLoginMessage = res.message ?? null;
    state.whatsappLoginQrDataUrl = res.qrDataUrl ?? null;
    state.whatsappLoginConnected = typeof res.connected === "boolean" ? res.connected : null;
  } catch (err) {
    state.whatsappLoginMessage = String(err);
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;
  } finally {
    state.whatsappBusy = false;
  }
}

export async function waitWhatsAppLogin(state: ChannelsState) {
  if (!state.client || !state.connected || state.whatsappBusy) {
    return;
  }
  state.whatsappBusy = true;
  try {
    const res = await state.client.request<{
      message?: string;
      connected?: boolean;
      qrDataUrl?: string;
    }>("web.login.wait", {
      timeoutMs: 120000,
      currentQrDataUrl: state.whatsappLoginQrDataUrl ?? undefined,
    });
    state.whatsappLoginMessage = res.message ?? null;
    state.whatsappLoginConnected = res.connected ?? null;
    if (res.qrDataUrl) {
      state.whatsappLoginQrDataUrl = res.qrDataUrl;
    } else if (res.connected) {
      state.whatsappLoginQrDataUrl = null;
    }
  } catch (err) {
    state.whatsappLoginMessage = String(err);
    state.whatsappLoginConnected = null;
  } finally {
    state.whatsappBusy = false;
  }
}

export async function logoutWhatsApp(state: ChannelsState) {
  if (!state.client || !state.connected || state.whatsappBusy) {
    return;
  }
  state.whatsappBusy = true;
  try {
    await state.client.request("channels.logout", { channel: "whatsapp" });
    state.whatsappLoginMessage = "Logged out.";
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;
  } catch (err) {
    state.whatsappLoginMessage = String(err);
  } finally {
    state.whatsappBusy = false;
  }
}
