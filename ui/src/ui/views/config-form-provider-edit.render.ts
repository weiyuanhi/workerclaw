// Renders the models.providers edit modal with kind-specific fields.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { resolveLocalModelProviderPreset } from "./config-form-provider-presets.ts";
import { renderNode } from "./config-form.node.ts";
import {
  cancelModelProviderEditPanel,
  clearModelProviderEditPanelError,
  getModelProviderEditPanelState,
  isModelProviderEditPanelSchema,
  patchModelProviderEditDraft,
  setModelProviderEditQuickModelId,
  setModelProviderEditShowAdvanced,
  submitModelProviderEditPanel,
} from "./config-form-provider-edit.ts";

function renderAdvancedProviderForm(context: {
  schema: Parameters<typeof renderNode>[0]["schema"];
  draftEntry: Record<string, unknown>;
  entryPath: Array<string | number>;
  hints: Parameters<typeof renderNode>[0]["hints"];
  rawAvailable?: boolean;
  unsupported: Set<string>;
  disabled: boolean;
  providerId: string;
  contextPath: Array<string | number>;
  onRequestUpdate?: () => void;
}): TemplateResult | typeof nothing {
  const providerForm = isModelProviderEditPanelSchema(context.schema)
    ? renderNode({
        schema: context.schema,
        value: context.draftEntry,
        path: context.entryPath,
        hints: context.hints,
        rawAvailable: context.rawAvailable ?? true,
        unsupported: context.unsupported,
        disabled: context.disabled,
        showLabel: true,
        onPatch: (patchPath, value) => {
          patchModelProviderEditDraft(
            context.providerId,
            context.contextPath,
            patchPath,
            value,
          );
          clearModelProviderEditPanelError();
          context.onRequestUpdate?.();
        },
      })
    : html`<div class="cfg-field cfg-field--error">
        <div class="cfg-field__error">${t("configPage.form.unsupportedSchemaNode")}</div>
      </div>`;

  return html`
    <div class="cfg-provider-modal__form" data-model-provider-entry-form="true">
      ${providerForm}
    </div>
  `;
}

export function renderModelProviderEditModal(): TemplateResult | typeof nothing {
  const panelState = getModelProviderEditPanelState();
  if (!panelState.open || !panelState.context) {
    return nothing;
  }
  const { context } = panelState;
  const providerId = panelState.providerId;
  const entryPath = [...context.path, providerId];
  const errorKey = panelState.errorKey;
  const errorMessage = errorKey
    ? t(`configPage.modelsProviderModal.errors.${errorKey}`)
    : null;
  const kind = panelState.kind;
  const descriptionKey = `configPage.modelsProviderModal.descriptions.${kind}`;

  const advancedForm = renderAdvancedProviderForm({
    schema: context.schema,
    draftEntry: panelState.draftEntry,
    entryPath,
    hints: context.hints,
    rawAvailable: context.rawAvailable,
    unsupported: context.unsupported,
    disabled: context.disabled,
    providerId,
    contextPath: context.path,
    onRequestUpdate: context.onRequestUpdate,
  });

  const cloudForm = html`
    <p class="cfg-provider-modal__hint">${t("configPage.modelsProviderModal.cloudHint")}</p>
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.apiKey")}</span>
      <input
        class="cfg-input"
        type="password"
        autocomplete="off"
        data-model-provider-api-key-input="true"
        placeholder=${t("configPage.modelsProviderModal.apiKeyPlaceholder")}
        .value=${typeof panelState.draftEntry.apiKey === "string" ? panelState.draftEntry.apiKey : ""}
        @input=${(event: Event) => {
          patchModelProviderEditDraft(
            providerId,
            context.path,
            [...entryPath, "apiKey"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderEditPanelError();
          context.onRequestUpdate?.();
        }}
      />
    </label>
    <label class="cfg-provider-modal__toggle">
      <input
        type="checkbox"
        .checked=${panelState.showAdvanced}
        @change=${(event: Event) => {
          setModelProviderEditShowAdvanced((event.target as HTMLInputElement).checked);
        }}
      />
      <span>${t("configPage.modelsProviderModal.showAdvanced")}</span>
    </label>
    ${panelState.showAdvanced ? advancedForm : nothing}
  `;

  const localPreset = resolveLocalModelProviderPreset(providerId);
  const localForm = html`
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.baseUrl")}</span>
      <input
        class="cfg-input"
        type="text"
        data-model-provider-base-url-input="true"
        placeholder=${t("configPage.modelsProviderModal.baseUrlPlaceholder")}
        .value=${typeof panelState.draftEntry.baseUrl === "string" ? panelState.draftEntry.baseUrl : ""}
        @input=${(event: Event) => {
          patchModelProviderEditDraft(
            providerId,
            context.path,
            [...entryPath, "baseUrl"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderEditPanelError();
          context.onRequestUpdate?.();
        }}
      />
    </label>
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.modelId")}</span>
      <input
        class="cfg-input"
        type="text"
        data-model-provider-model-id-input="true"
        placeholder=${localPreset ? t(localPreset.modelPlaceholderKey) : ""}
        .value=${panelState.quickModelId}
        @input=${(event: Event) => {
          setModelProviderEditQuickModelId((event.target as HTMLInputElement).value);
        }}
      />
    </label>
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.apiKey")}</span>
      <input
        class="cfg-input"
        type="password"
        autocomplete="off"
        data-model-provider-local-api-key-input="true"
        placeholder=${t("configPage.modelsProviderModal.localApiKeyPlaceholder")}
        .value=${typeof panelState.draftEntry.apiKey === "string" ? panelState.draftEntry.apiKey : ""}
        @input=${(event: Event) => {
          patchModelProviderEditDraft(
            providerId,
            context.path,
            [...entryPath, "apiKey"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderEditPanelError();
          context.onRequestUpdate?.();
        }}
      />
    </label>
    <p class="cfg-provider-modal__hint">${t("configPage.modelsProviderModal.localHint")}</p>
    <label class="cfg-provider-modal__toggle">
      <input
        type="checkbox"
        .checked=${panelState.showAdvanced}
        @change=${(event: Event) => {
          setModelProviderEditShowAdvanced((event.target as HTMLInputElement).checked);
        }}
      />
      <span>${t("configPage.modelsProviderModal.showAdvanced")}</span>
    </label>
    ${panelState.showAdvanced ? advancedForm : nothing}
  `;

  const customForm = html`
    ${advancedForm}
  `;

  const bodyForm =
    kind === "cloud" ? cloudForm : kind === "local" ? localForm : customForm;

  return html`
    <div
      class="cfg-provider-modal"
      role="presentation"
      data-model-provider-edit-modal="true"
      @click=${(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          cancelModelProviderEditPanel();
        }
      }}
    >
      <form
        class="cfg-provider-modal__dialog cfg-provider-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-provider-edit-modal-title"
        aria-describedby="cfg-provider-edit-modal-description"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          submitModelProviderEditPanel();
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelModelProviderEditPanel();
          }
        }}
      >
        <div class="cfg-provider-modal__header">
          <div>
            <h2 id="cfg-provider-edit-modal-title">
              ${t("configPage.modelsProviderModal.editTitle", { provider: providerId })}
            </h2>
            <p id="cfg-provider-edit-modal-description">${t(descriptionKey)}</p>
            <span class="cfg-provider-row__pill cfg-provider-row__pill--configured cfg-provider-modal__kind-badge">
              ${t(`configPage.modelsProviderModal.kinds.${kind}`)}
            </span>
          </div>
          <button
            type="button"
            class="btn btn--icon"
            title=${t("common.cancel")}
            aria-label=${t("common.cancel")}
            @click=${() => cancelModelProviderEditPanel()}
          >
            ${icons.x}
          </button>
        </div>

        <div class="cfg-provider-modal__body">${bodyForm}</div>

        ${errorMessage
          ? html`<div class="cfg-provider-modal__error" role="alert">${errorMessage}</div>`
          : nothing}

        <div class="cfg-provider-modal__actions">
          <button type="button" class="btn" @click=${() => cancelModelProviderEditPanel()}>
            ${t("common.cancel")}
          </button>
          <button type="submit" class="btn primary" data-model-provider-edit-submit="true">
            ${t("configPage.modelsProviderModal.saveProvider")}
          </button>
        </div>
      </form>
    </div>
  `;
}
