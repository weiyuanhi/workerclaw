// Renders the channel configuration edit modal on the Channels page.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { analyzeConfigSchema, renderNode } from "./config-form.ts";
import {
  cancelChannelConfigModal,
  getChannelConfigModalState,
  patchChannelConfigDraft,
  resolveChannelConfigModalSchema,
  submitChannelConfigModal,
} from "./channels-config-modal.ts";

export function renderChannelConfigEditModal(): TemplateResult | typeof nothing {
  const modalState = getChannelConfigModalState();
  if (!modalState.open || !modalState.context) {
    return nothing;
  }
  const { context } = modalState;
  const channelId = context.channelId;
  const entryPath = ["channels", channelId];
  const node = resolveChannelConfigModalSchema(context.schema, channelId);
  const analysis = analyzeConfigSchema(context.schema);

  const form = node
    ? html`
        <div class="cfg-provider-modal__form" data-channel-config-entry-form="true">
          ${renderNode({
            schema: node,
            value: modalState.draftEntry,
            path: entryPath,
            hints: context.uiHints,
            unsupported: new Set(analysis.unsupportedPaths),
            disabled: context.disabled,
            showLabel: true,
            onPatch: (patchPath, value) => {
              patchChannelConfigDraft(channelId, patchPath, value);
              context.onRequestUpdate?.();
            },
          })}
        </div>
      `
    : html`<div class="callout danger">${t("channels.config.channelSchemaUnavailable")}</div>`;

  return html`
    <div
      class="cfg-provider-modal"
      role="presentation"
      data-channel-config-modal="true"
      @click=${(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          cancelChannelConfigModal();
        }
      }}
    >
      <form
        class="cfg-provider-modal__dialog cfg-provider-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-config-modal-title"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          submitChannelConfigModal();
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelChannelConfigModal();
          }
        }}
      >
        <div class="cfg-provider-modal__header">
          <div>
            <h2 id="channel-config-modal-title">
              ${t("channels.config.editTitle", { channel: context.channelLabel })}
            </h2>
            <p>${t("channels.config.editSubtitle")}</p>
          </div>
          <button
            type="button"
            class="btn btn--icon"
            title=${t("common.cancel")}
            aria-label=${t("common.cancel")}
            @click=${() => cancelChannelConfigModal()}
          >
            ${icons.x}
          </button>
        </div>

        <div class="cfg-provider-modal__body">${form}</div>

        <div class="cfg-provider-modal__actions">
          <button type="button" class="btn" @click=${() => cancelChannelConfigModal()}>
            ${t("common.cancel")}
          </button>
          <button
            type="submit"
            class="btn primary"
            data-channel-config-submit="true"
            ?disabled=${context.disabled || !node}
          >
            ${t("channels.config.applyChanges")}
          </button>
        </div>
      </form>
    </div>
  `;
}
