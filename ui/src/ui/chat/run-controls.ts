// Control UI chat module implements run controls behavior.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";

export type ChatRunControlsProps = {
  canAbort: boolean;
  connected: boolean;
  draft: string;
  hasMessages: boolean;
  isBusy: boolean;
  sending: boolean;
  onAbort?: () => void;
  onExport: () => void;
  onNewSession: () => void;
  onSend: () => void;
  onStoreDraft: (draft: string) => void;
  showSecondary?: boolean;
};

export function renderChatRunControls(props: ChatRunControlsProps) {
  const showSecondary = props.showSecondary ?? true;
  const sendHint = props.isBusy
    ? t("chat.composer.toolbarHints.queueHint")
    : t("chat.composer.toolbarHints.sendHint");
  const sendLabel = props.isBusy
    ? t("chat.composer.toolbarHints.queue")
    : t("chat.composer.toolbarHints.send");
  return html`
    <div class="agent-chat__toolbar-right">
      ${showSecondary && !props.canAbort
        ? html`
            <button
              class="btn btn--ghost"
              @click=${props.onNewSession}
              title=${t("chat.runControls.newSession")}
              aria-label=${t("chat.runControls.newSession")}
            >
              ${icons.plus}
              <span class="agent-chat__control-label">${t("chat.runControls.newSession")}</span>
            </button>
          `
        : nothing}
      ${showSecondary
        ? html`
            <button
              class="btn btn--ghost"
              @click=${props.onExport}
              title=${t("chat.runControls.export")}
              aria-label=${t("chat.runControls.exportChat")}
              ?disabled=${!props.hasMessages}
            >
              ${icons.download}
              <span class="agent-chat__control-label">${t("chat.runControls.export")}</span>
            </button>
          `
        : nothing}
      ${props.canAbort
        ? html`
            <button
              class="chat-send-btn"
              @click=${() => {
                if (props.draft.trim()) {
                  props.onStoreDraft(props.draft);
                }
                props.onSend();
              }}
              ?disabled=${!props.connected || props.sending}
              title=${t("chat.composer.toolbarHints.queueHint")}
              aria-label=${t("chat.runControls.queueMessage")}
              data-tooltip=${t("chat.composer.toolbarHints.queueHint")}
            >
              ${icons.send}
              <span class="agent-chat__control-label">${t("chat.runControls.queue")}</span>
            </button>
            <button
              class="chat-send-btn chat-send-btn--stop"
              @click=${props.onAbort}
              title=${t("chat.composer.toolbarHints.stopHint")}
              aria-label=${t("chat.runControls.stopGenerating")}
              data-tooltip=${t("chat.composer.toolbarHints.stopHint")}
            >
              ${icons.stop}
              <span class="agent-chat__control-label">${t("chat.runControls.stop")}</span>
            </button>
          `
        : html`
            <button
              class="chat-send-btn"
              @click=${() => {
                if (props.draft.trim()) {
                  props.onStoreDraft(props.draft);
                }
                props.onSend();
              }}
              ?disabled=${!props.connected || props.sending}
              title=${sendHint}
              aria-label=${props.isBusy
                ? t("chat.runControls.queueMessage")
                : t("chat.runControls.sendMessage")}
              data-tooltip=${sendHint}
            >
              ${icons.send}
              <span class="agent-chat__control-label">${sendLabel}</span>
            </button>
          `}
    </div>
  `;
}
