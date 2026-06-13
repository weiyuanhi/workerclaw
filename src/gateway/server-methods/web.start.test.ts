/**
 * Tests web.start gateway method behavior and backend launch responses.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelRuntimeSnapshot } from "../server-channel-runtime.types.js";
import type { GatewayRequestHandlerOptions } from "./types.js";

const mocks = vi.hoisted(() => ({
  listChannelPlugins: vi.fn(),
  getChannelPlugin: vi.fn(),
  resolveWebLoginChannelPlugin: vi.fn(),
  buildWebLoginUnsupportedMessage: vi.fn(
    () => "web login is not supported for channel openclaw-weixin",
  ),
}));

vi.mock("../../channels/plugins/index.js", () => ({
  listChannelPlugins: mocks.listChannelPlugins,
  getChannelPlugin: mocks.getChannelPlugin,
}));

vi.mock("./web-login-channel.js", () => ({
  resolveWebLoginChannelPlugin: mocks.resolveWebLoginChannelPlugin,
  buildWebLoginUnsupportedMessage: mocks.buildWebLoginUnsupportedMessage,
}));

vi.mock("./web-login-qr.js", () => ({
  normalizeWebLoginQrResult: vi.fn(async (result: { qrDataUrl?: string; message: string }) => result),
}));

import { webHandlers } from "./web.js";

function createRunningWhatsappSnapshot(): ChannelRuntimeSnapshot {
  return {
    channels: {
      whatsapp: {
        accountId: "default",
        running: true,
      },
    },
    channelAccounts: {
      whatsapp: {
        default: {
          accountId: "default",
          running: true,
        },
      },
    },
  };
}

function createOptions(
  params: Record<string, unknown>,
  overrides?: Partial<GatewayRequestHandlerOptions>,
): GatewayRequestHandlerOptions {
  return {
    req: { type: "req", id: "req-1", method: "web.login.start", params },
    params,
    client: null,
    isWebchatConnect: () => false,
    respond: vi.fn(),
    context: {
      stopChannel: vi.fn(),
      startChannel: vi.fn(),
      getRuntimeSnapshot: vi.fn(createRunningWhatsappSnapshot),
    },
    ...overrides,
  } as unknown as GatewayRequestHandlerOptions;
}

function createRunningWhatsappContext() {
  const startChannel = vi.fn();
  const stopChannel = vi.fn();
  return {
    startChannel,
    stopChannel,
    context: {
      stopChannel,
      startChannel,
      getRuntimeSnapshot: vi.fn(createRunningWhatsappSnapshot),
    } as unknown as GatewayRequestHandlerOptions["context"],
  };
}

describe("webHandlers web.login.start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restarts a previously running channel when login start exits early without a QR", async () => {
    const loginWithQrStart = vi.fn().mockResolvedValue({
      code: "whatsapp-auth-unstable",
      message: "retry later",
    });
    mocks.listChannelPlugins.mockReturnValue([
      {
        id: "whatsapp",
        gatewayMethods: ["web.login.start"],
        gateway: { loginWithQrStart },
      },
    ]);
    const { context, startChannel, stopChannel } = createRunningWhatsappContext();
    const respond = vi.fn();

    await webHandlers["web.login.start"](
      createOptions(
        { accountId: "default" },
        {
          respond,
          context,
        },
      ),
    );

    expect(stopChannel).toHaveBeenCalledWith("whatsapp", "default");
    expect(startChannel).toHaveBeenCalledWith("whatsapp", "default");
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        code: "whatsapp-auth-unstable",
        message: "retry later",
      },
      undefined,
    );
  });

  it("keeps the channel stopped when login start has taken over with a QR flow", async () => {
    const loginWithQrStart = vi.fn().mockResolvedValue({
      qrDataUrl: "data:image/png;base64,qr",
      message: "scan qr",
    });
    mocks.listChannelPlugins.mockReturnValue([
      {
        id: "whatsapp",
        gatewayMethods: ["web.login.start"],
        gateway: { loginWithQrStart },
      },
    ]);
    const { context, startChannel, stopChannel } = createRunningWhatsappContext();

    await webHandlers["web.login.start"](
      createOptions(
        { accountId: "default" },
        {
          context,
        },
      ),
    );

    expect(stopChannel).toHaveBeenCalledWith("whatsapp", "default");
    expect(startChannel).not.toHaveBeenCalled();
  });

  it("preserves gateway method receiver state for login start", async () => {
    const gateway = {
      marker: "gateway-state",
      async loginWithQrStart(this: { marker: string }) {
        return {
          connected: true,
          message: this.marker,
        };
      },
    };
    const loginWithQrStart = vi.spyOn(gateway, "loginWithQrStart");
    mocks.listChannelPlugins.mockReturnValue([
      {
        id: "whatsapp",
        gatewayMethods: ["web.login.start"],
        gateway,
      },
    ]);
    const respond = vi.fn();

    await webHandlers["web.login.start"](
      createOptions(
        { accountId: "default" },
        {
          respond,
        },
      ),
    );

    expect(loginWithQrStart).toHaveBeenCalledWith({
      accountId: "default",
      force: false,
      timeoutMs: undefined,
      verbose: false,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        connected: true,
        message: "gateway-state",
      },
      undefined,
    );
  });

  it("routes login start to an explicit channel when channel is provided", async () => {
    const loginWithQrStart = vi.fn().mockResolvedValue({
      qrDataUrl: "https://example.com/weixin-qr.png",
      message: "scan weixin qr",
      sessionKey: "session-1",
    });
    mocks.resolveWebLoginChannelPlugin.mockReturnValue({
      id: "openclaw-weixin",
      gateway: { loginWithQrStart },
    });
    const respond = vi.fn();

    await webHandlers["web.login.start"](
      createOptions(
        { channel: "openclaw-weixin" },
        {
          respond,
          context: {
            stopChannel: vi.fn(),
            startChannel: vi.fn(),
            getRuntimeSnapshot: vi.fn(createRunningWhatsappSnapshot),
            getRuntimeConfig: vi.fn(() => ({
              channels: { "openclaw-weixin": { enabled: true } },
            })),
          },
        },
      ),
    );

    expect(mocks.resolveWebLoginChannelPlugin).toHaveBeenCalledWith({
      channelInput: "openclaw-weixin",
      cfg: { channels: { "openclaw-weixin": { enabled: true } } },
    });
    expect(loginWithQrStart).toHaveBeenCalledWith({
      accountId: undefined,
      force: false,
      timeoutMs: undefined,
      verbose: false,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        qrDataUrl: "https://example.com/weixin-qr.png",
        message: "scan weixin qr",
        sessionKey: "session-1",
      },
      undefined,
    );
  });
});

describe("webHandlers web.login.wait", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes refreshed QR payloads back to the client while login is still pending", async () => {
    const loginWithQrWait = vi.fn().mockResolvedValue({
      connected: false,
      message: "QR refreshed. Scan the latest code in WhatsApp → Linked Devices.",
      qrDataUrl: "data:image/png;base64,next-qr",
    });
    mocks.listChannelPlugins.mockReturnValue([
      {
        id: "whatsapp",
        gatewayMethods: ["web.login.wait"],
        gateway: { loginWithQrWait },
      },
    ]);
    const respond = vi.fn();

    await webHandlers["web.login.wait"](
      createOptions(
        {
          accountId: "default",
          timeoutMs: 5000,
          currentQrDataUrl: "data:image/png;base64,current-qr",
        },
        {
          req: {
            type: "req",
            id: "req-2",
            method: "web.login.wait",
            params: {
              accountId: "default",
              timeoutMs: 5000,
              currentQrDataUrl: "data:image/png;base64,current-qr",
            },
          } as GatewayRequestHandlerOptions["req"],
          respond,
        },
      ),
    );

    expect(loginWithQrWait).toHaveBeenCalledWith({
      accountId: "default",
      timeoutMs: 5000,
      currentQrDataUrl: "data:image/png;base64,current-qr",
      sessionKey: undefined,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        connected: false,
        message: "QR refreshed. Scan the latest code in WhatsApp → Linked Devices.",
        qrDataUrl: "data:image/png;base64,next-qr",
      },
      undefined,
    );
  });
});
