// Normalizes plugin QR-login payloads into Control-UI-safe PNG data URLs.
import { formatQrPngDataUrl, renderQrPngDataUrl } from "../../media/qr-image.js";

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

function isPngDataUrl(value: string): boolean {
  return value.startsWith(PNG_DATA_URL_PREFIX);
}

function isLikelyRawPngBase64(value: string): boolean {
  return !value.includes("://") && /^[A-Za-z0-9+/=\s]+$/.test(value) && value.length > 100;
}

/** Converts plugin QR payloads into PNG data URLs the Control UI can render under CSP. */
export async function normalizeWebLoginQrDataUrl(
  value: string | undefined,
): Promise<string | undefined> {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  if (isLikelyRawPngBase64(trimmed)) {
    return formatQrPngDataUrl(trimmed.replace(/\s+/g, ""));
  }
  return await renderQrPngDataUrl(trimmed, { scale: 6, marginModules: 2 });
}

export async function normalizeWebLoginQrResult<
  TResult extends { qrDataUrl?: string; message: string },
>(result: TResult): Promise<TResult> {
  if (!result.qrDataUrl) {
    return result;
  }
  const qrDataUrl = await normalizeWebLoginQrDataUrl(result.qrDataUrl);
  if (!qrDataUrl || qrDataUrl === result.qrDataUrl) {
    return result;
  }
  return {
    ...result,
    qrDataUrl,
  };
}
