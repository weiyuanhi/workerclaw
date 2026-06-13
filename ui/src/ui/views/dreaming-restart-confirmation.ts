// Control UI view renders the Dreams header settings modal.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import {
  DREAMING_FREQUENCY_PRESETS,
  type DreamingFrequencyPreset,
  type DreamingSettingsDraft,
  resolveBrowserTimezone,
  resolveDreamingFrequencyFromPreset,
  resolveDreamingTimezoneOptions,
} from "../dreaming-settings.ts";
import type { ModelCatalogEntry } from "../types.ts";
import { listModelSelectOptions } from "./agents-utils.ts";
import "../components/modal-dialog.ts";

export type DreamingSettingsModalProps = {
  open: boolean;
  loading: boolean;
  draft: DreamingSettingsDraft;
  configForm: Record<string, unknown> | null;
  modelCatalog: ModelCatalogEntry[];
  onDraftChange: (draft: DreamingSettingsDraft) => void;
  onConfirm: () => void;
  onCancel: () => void;
  hasError: boolean;
};

const FREQUENCY_PRESET_ORDER: DreamingFrequencyPreset[] = ["daily", "every6h", "every12h", "custom"];

function frequencyPresetLabel(preset: DreamingFrequencyPreset): string {
  switch (preset) {
    case "daily":
      return t("dreaming.settingsModal.frequencyDaily");
    case "every6h":
      return t("dreaming.settingsModal.frequencyEvery6h");
    case "every12h":
      return t("dreaming.settingsModal.frequencyEvery12h");
    default:
      return t("dreaming.settingsModal.frequencyCustom");
  }
}

function updateDraft(
  props: DreamingSettingsModalProps,
  patch: Partial<DreamingSettingsDraft>,
): void {
  props.onDraftChange({ ...props.draft, ...patch });
}

export function renderDreamingSettingsModal(props: DreamingSettingsModalProps) {
  if (!props.open) {
    return nothing;
  }

  const titleId = "dreaming-settings-modal-title";
  const descriptionId = "dreaming-settings-modal-description";
  const title = t("dreaming.settingsModal.title");
  const description = t("dreaming.settingsModal.subtitle");
  const handleCancel = () => {
    if (!props.loading) {
      props.onCancel();
    }
  };
  const resolvedFrequency = resolveDreamingFrequencyFromPreset(
    props.draft.frequencyPreset,
    props.draft.frequency,
  );
  const localTimezone = resolveBrowserTimezone();
  const timezoneOptions = resolveDreamingTimezoneOptions({
    current: props.draft.timezone,
    localTimezone,
  });
  const modelOptions = listModelSelectOptions(
    props.configForm,
    props.draft.model || null,
    props.modelCatalog,
  );

  return html`
    <openclaw-modal-dialog label=${title} description=${description} @modal-cancel=${handleCancel}>
      <div class="dreaming-settings-modal exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div id=${titleId} class="exec-approval-title">${title}</div>
            <div id=${descriptionId} class="exec-approval-sub">${description}</div>
          </div>
        </div>

        <div class="dreaming-settings-modal__body cfg-fields">
          <label class="dreaming-settings-modal__toggle-row">
            <span class="dreaming-settings-modal__toggle-copy">
              <span class="cfg-field__label">${t("dreaming.settingsModal.enabled")}</span>
              <span class="cfg-field__help">${t("dreaming.settingsModal.enabledHint")}</span>
            </span>
            <input
              type="checkbox"
              ?checked=${props.draft.enabled}
              ?disabled=${props.loading}
              @change=${(event: Event) => {
                updateDraft(props, {
                  enabled: (event.target as HTMLInputElement).checked,
                });
              }}
            />
          </label>

          <div class="cfg-field">
            <div class="cfg-field__label">${t("dreaming.settingsModal.frequency")}</div>
            <div class="cfg-field__help">${t("dreaming.settingsModal.frequencyHint")}</div>
            <div class="cfg-segmented dreaming-settings-modal__segmented">
              ${FREQUENCY_PRESET_ORDER.map(
                (preset) => html`
                  <button
                    type="button"
                    class="cfg-segmented__btn ${props.draft.frequencyPreset === preset
                      ? "active"
                      : ""}"
                    ?disabled=${props.loading}
                    @click=${() => {
                      updateDraft(props, {
                        frequencyPreset: preset,
                        frequency:
                          preset === "custom"
                            ? props.draft.frequency
                            : DREAMING_FREQUENCY_PRESETS[preset],
                      });
                    }}
                  >
                    ${frequencyPresetLabel(preset)}
                  </button>
                `,
              )}
            </div>
            ${props.draft.frequencyPreset === "custom"
              ? html`
                  <div class="cfg-input-wrap dreaming-settings-modal__custom-frequency">
                    <input
                      class="cfg-input"
                      type="text"
                      spellcheck="false"
                      placeholder=${t("dreaming.settingsModal.frequencyPlaceholder")}
                      .value=${props.draft.frequency}
                      ?disabled=${props.loading}
                      @input=${(event: Event) => {
                        updateDraft(props, {
                          frequency: (event.target as HTMLInputElement).value,
                        });
                      }}
                    />
                  </div>
                `
              : html`
                  <div class="dreaming-settings-modal__resolved-frequency mono">${resolvedFrequency}</div>
                `}
          </div>

          <div class="cfg-field">
            <label class="cfg-field__label" for="dreaming-settings-timezone"
              >${t("dreaming.settingsModal.timezone")}</label
            >
            <div class="cfg-field__help">${t("dreaming.settingsModal.timezoneHint")}</div>
            <select
              id="dreaming-settings-timezone"
              class="cfg-select dreaming-settings-modal__select"
              .value=${props.draft.timezone}
              ?disabled=${props.loading}
              @change=${(event: Event) => {
                updateDraft(props, {
                  timezone: (event.target as HTMLSelectElement).value,
                });
              }}
            >
              <option value="">${t("dreaming.settingsModal.timezoneDefault")}</option>
              ${timezoneOptions.map(
                (timezone) => html`
                  <option value=${timezone}>
                    ${timezone === localTimezone
                      ? t("dreaming.settingsModal.timezoneLocal", { timezone })
                      : timezone}
                  </option>
                `,
              )}
            </select>
          </div>

          <div class="cfg-field">
            <label class="cfg-field__label" for="dreaming-settings-model"
              >${t("dreaming.settingsModal.model")}</label
            >
            <div class="cfg-field__help">${t("dreaming.settingsModal.modelHint")}</div>
            ${modelOptions.length > 0
              ? html`
                  <select
                    id="dreaming-settings-model"
                    class="cfg-select dreaming-settings-modal__select"
                    .value=${props.draft.model}
                    ?disabled=${props.loading}
                    @change=${(event: Event) => {
                      updateDraft(props, {
                        model: (event.target as HTMLSelectElement).value,
                      });
                    }}
                  >
                    <option value="">${t("dreaming.settingsModal.modelDefault")}</option>
                    ${modelOptions.map(
                      (option) => html`
                        <option value=${option.value}>${option.label}</option>
                      `,
                    )}
                  </select>
                `
              : html`
                  <div class="cfg-input-wrap">
                    <input
                      id="dreaming-settings-model"
                      class="cfg-input"
                      type="text"
                      spellcheck="false"
                      placeholder=${t("dreaming.settingsModal.modelPlaceholder")}
                      .value=${props.draft.model}
                      ?disabled=${props.loading}
                      @input=${(event: Event) => {
                        updateDraft(props, {
                          model: (event.target as HTMLInputElement).value,
                        });
                      }}
                    />
                  </div>
                  <div class="cfg-field__help dreaming-settings-modal__fallback-hint">
                    ${t("dreaming.settingsModal.modelFallbackHint")}
                  </div>
                `}
          </div>

          <div class="cfg-field">
            <label class="cfg-field__label" for="dreaming-settings-max-tokens"
              >${t("dreaming.settingsModal.maxPromotedSnippetTokens")}</label
            >
            <div class="cfg-field__help">${t("dreaming.settingsModal.maxPromotedSnippetTokensHint")}</div>
            <div class="cfg-number">
              <button
                type="button"
                class="cfg-number__btn"
                ?disabled=${props.loading || props.draft.maxPromotedSnippetTokens <= 1}
                @click=${() => {
                  updateDraft(props, {
                    maxPromotedSnippetTokens: Math.max(1, props.draft.maxPromotedSnippetTokens - 8),
                  });
                }}
              >
                −
              </button>
              <input
                id="dreaming-settings-max-tokens"
                class="cfg-number__input"
                type="number"
                min="1"
                .value=${String(props.draft.maxPromotedSnippetTokens)}
                ?disabled=${props.loading}
                @input=${(event: Event) => {
                  const raw = (event.target as HTMLInputElement).value;
                  const parsed = Number(raw);
                  updateDraft(props, {
                    maxPromotedSnippetTokens:
                      raw.trim() === "" || Number.isNaN(parsed) ? 1 : Math.max(1, Math.floor(parsed)),
                  });
                }}
              />
              <button
                type="button"
                class="cfg-number__btn"
                ?disabled=${props.loading}
                @click=${() => {
                  updateDraft(props, {
                    maxPromotedSnippetTokens: props.draft.maxPromotedSnippetTokens + 8,
                  });
                }}
              >
                +
              </button>
            </div>
          </div>

          <fieldset class="dreaming-settings-modal__phases">
            <legend class="cfg-field__label">${t("dreaming.settingsModal.phasesTitle")}</legend>
            <div class="cfg-field__help">${t("dreaming.settingsModal.phasesHint")}</div>
            <div class="dreaming-settings-modal__phase-grid">
              ${(["light", "rem", "deep"] as const).map(
                (phase) => html`
                  <label class="dreaming-settings-modal__phase">
                    <input
                      type="checkbox"
                      ?checked=${props.draft.phases[phase]}
                      ?disabled=${props.loading}
                      @change=${(event: Event) => {
                        updateDraft(props, {
                          phases: {
                            ...props.draft.phases,
                            [phase]: (event.target as HTMLInputElement).checked,
                          },
                        });
                      }}
                    />
                    <span>${t(`dreaming.phase.${phase}`)}</span>
                  </label>
                `,
              )}
            </div>
          </fieldset>
        </div>

        <div class="callout info dreaming-settings-modal__note">
          ${t("dreaming.settingsModal.note")}
        </div>

        ${props.hasError
          ? html`<div class="exec-approval-error">${t("dreaming.settingsModal.failed")}</div>`
          : nothing}

        <div class="exec-approval-actions">
          <button class="btn primary" ?disabled=${props.loading} @click=${props.onConfirm}>
            ${props.loading ? t("dreaming.settingsModal.saving") : t("dreaming.settingsModal.save")}
          </button>
          <button class="btn" ?disabled=${props.loading} @click=${props.onCancel}>
            ${t("common.cancel")}
          </button>
        </div>
      </div>
    </openclaw-modal-dialog>
  `;
}

/** @deprecated Use renderDreamingSettingsModal. */
export const renderDreamingRestartConfirmation = renderDreamingSettingsModal;

export type DreamingRestartConfirmationProps = DreamingSettingsModalProps;
