// Tests web-login QR normalization for Control UI rendering.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../media/qr-image.js", () => ({
  formatQrPngDataUrl: (base64: string) => `data:image/png;base64,${base64}`,
  renderQrPngDataUrl: vi.fn(async (input: string) => `data:image/png;base64,qr-for:${input}`),
}));

import { renderQrPngDataUrl } from "../../media/qr-image.js";
import { normalizeWebLoginQrDataUrl } from "./web-login-qr.js";

describe("normalizeWebLoginQrDataUrl", () => {
  it("passes through existing PNG data URLs", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    await expect(normalizeWebLoginQrDataUrl(dataUrl)).resolves.toBe(dataUrl);
  });

  it("renders login links into PNG data URLs", async () => {
    const loginUrl = "https://login.weixin.qq.com/qrcode/abc";
    await expect(normalizeWebLoginQrDataUrl(loginUrl)).resolves.toBe(
      "data:image/png;base64,qr-for:https://login.weixin.qq.com/qrcode/abc",
    );
    expect(renderQrPngDataUrl).toHaveBeenCalledWith(loginUrl, {
      scale: 6,
      marginModules: 2,
    });
  });
});
