// Renders the models.providers create modal with quick-add presets and advanced form.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import {
  CLOUD_MODEL_PROVIDER_PRESETS,
  LOCAL_MODEL_PROVIDER_PRESETS,
  MODEL_PROVIDER_CREATE_KINDS,
  type ModelProviderCreateKind,
} from "./config-form-provider-presets.ts";
import { renderNode } from "./config-form.node.ts";
import {
  cancelModelProviderCreateModal,
  clearModelProviderCreateModalError,
  getModelProviderCreateModalState,
  isModelProviderCreateModalSchema,
  patchModelProviderCreateDraft,
  resolveModelProviderDraftKey,
  setModelProviderCreateModalKind,
  setModelProviderCreateModalPreset,
  setModelProviderCreateModalProviderId,
  setModelProviderCreateModalShowAdvanced,
  setModelProviderCreateQuickModelId,
  submitModelProviderCreateModal,
} from "./config-form-provider-modal.ts";

function renderKindSelector(
  kind: ModelProviderCreateKind,
  onSelect: (next: ModelProviderCreateKind) => void,
): TemplateResult {
  return html`
    <div
      class="cfg-provider-modal__kind"
      role="tablist"
      aria-label=${t("configPage.modelsProviderModal.kindLabel")}
    >
      ${MODEL_PROVIDER_CREATE_KINDS.map(
        (entry) => html`
          <button
            type="button"
            class="cfg-provider-modal__kind-btn ${kind === entry ? "active" : ""}"
            role="tab"
            aria-selected=${kind === entry ? "true" : "false"}
            data-model-provider-kind=${entry}
            @click=${() => onSelect(entry)}
          >
            ${t(`configPage.modelsProviderModal.kinds.${entry}`)}
          </button>
        `,
      )}
    </div>
  `;
}

function renderPresetSelect(params: {
  presetId: string;
  options: ReadonlyArray<{ id: string; labelKey: string }>;
  existing: Record<string, unknown>;
  onSelect: (presetId: string) => void;
}): TemplateResult {
  return html`
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.providerSelect")}</span>
      <select
        class="cfg-input"
        data-model-provider-preset-select="true"
        .value=${params.presetId}
        @change=${(event: Event) => {
          params.onSelect((event.target as HTMLSelectElement).value);
        }}
      >
        ${params.options.map(
          (preset) => html`
            <option value=${preset.id} ?disabled=${preset.id in params.existing}>
              ${t(preset.labelKey)}${preset.id in params.existing
                ? ` (${t("configPage.modelsProviderModal.alreadyAdded")})`
                : ""}
            </option>
          `,
        )}
      </select>
    </label>
  `;
}

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
  const providerForm = isModelProviderCreateModalSchema(context.schema)
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
          patchModelProviderCreateDraft(
            context.providerId,
            context.contextPath,
            patchPath,
            value,
          );
          clearModelProviderCreateModalError();
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

export function renderModelProviderCreateModal(): TemplateResult | typeof nothing {
  const modalState = getModelProviderCreateModalState();
  if (!modalState.open || !modalState.context) {
    return nothing;
  }
  const { context } = modalState;
  const existing = context.value ?? {};
  const draftKey = resolveModelProviderDraftKey(modalState.providerId);
  const entryPath = [...context.path, draftKey];
  const errorKey = modalState.errorKey;
  const errorMessage = errorKey
    ? t(`configPage.modelsProviderModal.errors.${errorKey}`)
    : null;
  const descriptionKey = `configPage.modelsProviderModal.descriptions.${modalState.kind}`;

  const advancedForm = renderAdvancedProviderForm({
    schema: context.schema,
    draftEntry: modalState.draftEntry,
    entryPath,
    hints: context.hints,
    rawAvailable: context.rawAvailable,
    unsupported: context.unsupported,
    disabled: context.disabled,
    providerId: modalState.providerId,
    contextPath: context.path,
    onRequestUpdate: context.onRequestUpdate,
  });

  const cloudForm = html`
    ${renderPresetSelect({
      presetId: modalState.presetId,
      options: CLOUD_MODEL_PROVIDER_PRESETS,
      existing,
      onSelect: setModelProviderCreateModalPreset,
    })}
    <p class="cfg-provider-modal__hint">${t("configPage.modelsProviderModal.cloudHint")}</p>
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.apiKey")}</span>
      <input
        class="cfg-input"
        type="password"
        autocomplete="off"
        data-model-provider-api-key-input="true"
        placeholder=${t("configPage.modelsProviderModal.apiKeyPlaceholder")}
        .value=${typeof modalState.draftEntry.apiKey === "string" ? modalState.draftEntry.apiKey : ""}
        @input=${(event: Event) => {
          patchModelProviderCreateDraft(
            modalState.providerId,
            context.path,
            [...entryPath, "apiKey"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderCreateModalError();
          context.onRequestUpdate?.();
        }}
      />
    </label>
    <label class="cfg-provider-modal__toggle">
      <input
        type="checkbox"
        .checked=${modalState.showAdvanced}
        @change=${(event: Event) => {
          setModelProviderCreateModalShowAdvanced((event.target as HTMLInputElement).checked);
        }}
      />
      <span>${t("configPage.modelsProviderModal.showAdvanced")}</span>
    </label>
    ${modalState.showAdvanced ? advancedForm : nothing}
  `;

  const localPreset = LOCAL_MODEL_PROVIDER_PRESETS.find(
    (preset) => preset.id === modalState.presetId,
  );
  const localForm = html`
    ${renderPresetSelect({
      presetId: modalState.presetId,
      options: LOCAL_MODEL_PROVIDER_PRESETS,
      existing,
      onSelect: setModelProviderCreateModalPreset,
    })}
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.baseUrl")}</span>
      <input
        class="cfg-input"
        type="text"
        data-model-provider-base-url-input="true"
        placeholder=${t("configPage.modelsProviderModal.baseUrlPlaceholder")}
        .value=${typeof modalState.draftEntry.baseUrl === "string" ? modalState.draftEntry.baseUrl : ""}
        @input=${(event: Event) => {
          patchModelProviderCreateDraft(
            modalState.providerId,
            context.path,
            [...entryPath, "baseUrl"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderCreateModalError();
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
        .value=${modalState.quickModelId}
        @input=${(event: Event) => {
          setModelProviderCreateQuickModelId((event.target as HTMLInputElement).value);
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
        .value=${typeof modalState.draftEntry.apiKey === "string" ? modalState.draftEntry.apiKey : ""}
        @input=${(event: Event) => {
          patchModelProviderCreateDraft(
            modalState.providerId,
            context.path,
            [...entryPath, "apiKey"],
            (event.target as HTMLInputElement).value,
          );
          clearModelProviderCreateModalError();
          context.onRequestUpdate?.();
        }}
      />
    </label>
    <p class="cfg-provider-modal__hint">${t("configPage.modelsProviderModal.localHint")}</p>
  `;

  const customForm = html`
    <label class="cfg-provider-modal__field">
      <span>${t("configPage.modelsProviderModal.providerId")}</span>
      <input
        class="cfg-input"
        type="text"
        data-model-provider-id-input="true"
        placeholder=${t("configPage.modelsProviderModal.providerIdPlaceholder")}
        .value=${modalState.providerId}
        @input=${(event: Event) => {
          setModelProviderCreateModalProviderId((event.target as HTMLInputElement).value);
        }}
      />
    </label>
    ${advancedForm}
  `;

  const bodyForm =
    modalState.kind === "cloud"
      ? cloudForm
      : modalState.kind === "local"
        ? localForm
        : customForm;

  return html`
    <div
      class="cfg-provider-modal"
      role="presentation"
      data-model-provider-modal="true"
      @click=${(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          cancelModelProviderCreateModal();
        }
      }}
    >
      <form
        class="cfg-provider-modal__dialog cfg-provider-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-provider-modal-title"
        aria-describedby="cfg-provider-modal-description"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          submitModelProviderCreateModal();
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelModelProviderCreateModal();
          }
        }}
      >
        <div class="cfg-provider-modal__header">
          <div>
            <h2 id="cfg-provider-modal-title">${t("configPage.modelsProviderModal.title")}</h2>
            <p id="cfg-provider-modal-description">${t(descriptionKey)}</p>
          </div>
          <button
            type="button"
            class="btn btn--icon"
            title=${t("common.cancel")}
            aria-label=${t("common.cancel")}
            @click=${() => cancelModelProviderCreateModal()}
          >
            ${icons.x}
          </button>
        </div>

        ${renderKindSelector(modalState.kind, setModelProviderCreateModalKind)}

        <div class="cfg-provider-modal__body">${bodyForm}</div>

        ${errorMessage
          ? html`<div class="cfg-provider-modal__error" role="alert">${errorMessage}</div>`
          : nothing}

        <div class="cfg-provider-modal__actions">
          <button type="button" class="btn" @click=${() => cancelModelProviderCreateModal()}>
            ${t("common.cancel")}
          </button>
          <button type="submit" class="btn primary" data-model-provider-submit="true">
            ${t("configPage.modelsProviderModal.create")}
          </button>
        </div>
      </form>
    </div>
  `;
}
