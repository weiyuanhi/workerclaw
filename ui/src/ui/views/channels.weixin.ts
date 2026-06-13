// Control UI view renders WeChat (openclaw-weixin) channel card with QR login.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import {
  formatNullableBoolean,
  renderChannelAccountCount,
  resolveChannelDisplayState,
} from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";

export const WEIXIN_CHANNEL_ID = "openclaw-weixin";

export function renderWeixinCard(params: {
  props: ChannelsProps;
  channelId: string;
  channelLabel: string;
  accountCountLabel: unknown;
}) {
  const { props, channelId, channelLabel, accountCountLabel } = params;
  const displayState = resolveChannelDisplayState(channelId, props);
  const hasQr = props.weixinLoginQrUrl != null;
  const waitingForConfirm = hasQr && props.weixinBusy;
  const lastError =
    typeof displayState.status?.lastError === "string" ? displayState.status.lastError : undefined;

  return html`
    <div class="card">
      <div class="card-title">${channelLabel}</div>
      <div class="card-sub">${t("channels.weixin.subtitle")}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${t("common.configured")}</span>
          <span>${formatNullableBoolean(displayState.configured)}</span>
        </div>
        <div>
          <span class="label">${t("common.running")}</span>
          <span>${formatNullableBoolean(displayState.running)}</span>
        </div>
        <div>
          <span class="label">${t("common.connected")}</span>
          <span>${formatNullableBoolean(displayState.connected)}</span>
        </div>
      </div>

      ${props.weixinLoginMessage
        ? html`<div class="callout" style="margin-top: 12px;">${props.weixinLoginMessage}</div>`
        : nothing}
      ${props.weixinLoginQrUrl
        ? html`<div class="qr-wrap">
            <img src=${props.weixinLoginQrUrl} alt=${t("channels.weixin.qrAlt")} />
          </div>
          <div class="callout info" style="margin-top: 12px;">
            ${waitingForConfirm ? t("channels.weixin.waitingForConfirm") : t("channels.weixin.qrHint")}
          </div>`
        : nothing}
      ${lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">${lastError}</div>`
        : nothing}

      ${renderChannelConfigSection({
        channelId,
        channelLabel,
        props,
      })}

      <div class="row" style="margin-top: 14px; flex-wrap: wrap;">
        <button
          class="btn primary"
          ?disabled=${props.weixinBusy}
          @click=${() => props.onWeixinStart(false)}
        >
          ${props.weixinBusy
            ? waitingForConfirm
              ? t("channels.weixin.waitingForConfirm")
              : t("common.working")
            : t("common.showQr")}
        </button>
        ${hasQr && !waitingForConfirm
          ? html`<button
              class="btn"
              title=${t("channels.weixin.scanConfirmTooltip")}
              ?disabled=${props.weixinBusy}
              @click=${() => props.onWeixinWait()}
            >
              ${t("channels.weixin.scanConfirm")}
            </button>`
          : nothing}
        <button class="btn" @click=${() => props.onRefresh(true)}>${t("common.refresh")}</button>
      </div>
    </div>
  `;
}
