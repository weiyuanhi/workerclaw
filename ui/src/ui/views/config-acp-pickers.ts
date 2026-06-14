import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import type { AcpSetupCatalog } from "../../../../src/shared/acp-setup-catalog.ts";
import type { ConfigUiHints } from "../types.ts";
import { hintForPath } from "./config-form.shared.ts";

export type AcpPickerProps = {
  catalog: AcpSetupCatalog;
  catalogLoading?: boolean;
  uiHints: ConfigUiHints;
  disabled?: boolean;
  backend?: string;
  defaultAgent?: string;
  allowedAgents?: string[];
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
};

let acpBackendCustomMode = false;

/** Resets transient ACP backend picker UI state (for tests and section re-entry). */
export function resetAcpBackendPickerUiState(): void {
  acpBackendCustomMode = false;
}

export function resolveAcpBackendPresetIds(catalog: AcpSetupCatalog): string[] {
  return catalog.backends.map((entry) => entry.id);
}

export function resolveAcpBackendCustomMode(params: {
  selected: string;
  presetIds: readonly string[];
  uiCustomMode?: boolean;
}): boolean {
  if (params.uiCustomMode === true) {
    return true;
  }
  return Boolean(params.selected) && !params.presetIds.includes(params.selected);
}

export function resolveDefaultAcpBackendId(catalog: AcpSetupCatalog): string | undefined {
  const healthy = catalog.backends.find((entry) => entry.registered && entry.healthy !== false);
  if (healthy) {
    return healthy.id;
  }
  const registered = catalog.backends.find((entry) => entry.registered);
  if (registered) {
    return registered.id;
  }
  return catalog.backends[0]?.id;
}

export function resolveSelectedBackendEntry(
  catalog: AcpSetupCatalog,
  backendId: string,
): AcpBackendCatalogEntry | undefined {
  const normalized = backendId.trim();
  if (!normalized) {
    return undefined;
  }
  return catalog.backends.find((entry) => entry.id === normalized);
}

export function resolveBackendStatusHintKey(
  entry: AcpBackendCatalogEntry | undefined,
): "none" | "notLoaded" | "healthy" | "unhealthy" | "registered" {
  if (!entry) {
    return "none";
  }
  if (!entry.registered) {
    return "notLoaded";
  }
  if (entry.healthy === false) {
    return "unhealthy";
  }
  if (entry.healthy === true) {
    return "healthy";
  }
  return "registered";
}

function renderBackendStatusHint(entry: AcpBackendCatalogEntry | undefined): TemplateResult {
  const hintKey = resolveBackendStatusHintKey(entry);
  if (hintKey === "none") {
    return nothing;
  }
  const messageKey =
    hintKey === "notLoaded"
      ? "configPage.acp.backendStatusNotLoadedHint"
      : hintKey === "unhealthy"
        ? "configPage.acp.backendStatusUnhealthyHint"
        : hintKey === "healthy"
          ? "configPage.acp.backendStatusHealthyHint"
          : "configPage.acp.backendStatusRegisteredHint";
  const warn = hintKey === "notLoaded" || hintKey === "unhealthy";
  return html`
    <p class="config-acp-backend-status-hint ${warn ? "callout warn" : "muted"}">${t(messageKey)}</p>
  `;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

export function renderAcpBackendPicker(props: AcpPickerProps): TemplateResult {
  const selected = props.backend?.trim() || "";
  const help = hintForPath(["acp", "backend"], props.uiHints)?.help;
  const presetIds = resolveAcpBackendPresetIds(props.catalog);
  if (!acpBackendCustomMode && selected && !presetIds.includes(selected)) {
    acpBackendCustomMode = true;
  }
  const useCustom = resolveAcpBackendCustomMode({
    selected,
    presetIds,
    uiCustomMode: acpBackendCustomMode,
  });
  const hasPresets = props.catalog.backends.length > 0;
  const selectedPresetIndex = presetIds.indexOf(selected);
  const customDraft = useCustom ? selected : "";
  const selectedEntry = selected
    ? resolveSelectedBackendEntry(props.catalog, selected)
    : undefined;

  return html`
    <section class="config-memory-group">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">${t("configPage.acp.backendTitle")}</h4>
        ${help ? html`<p class="config-memory-group__hint">${help}</p>` : nothing}
        ${props.catalogLoading
          ? html`<p class="config-acp-picker__meta muted">${t("configPage.acp.catalogLoading")}</p>`
          : nothing}
      </div>
      ${!useCustom
        ? hasPresets
          ? html`
              <label class="config-acp-custom-field">
                <span class="config-acp-custom-field__label">${t("configPage.acp.backendSelectLabel")}</span>
                <select
                  class="cfg-select"
                  ?disabled=${props.disabled}
                  .value=${selectedPresetIndex >= 0 ? String(selectedPresetIndex) : ""}
                  @change=${(event: Event) => {
                    const value = (event.target as HTMLSelectElement).value;
                    if (!value) {
                      props.onPatch(["acp", "backend"], undefined);
                      return;
                    }
                    const backendId = presetIds[Number(value)];
                    if (backendId) {
                      props.onPatch(["acp", "backend"], backendId);
                    }
                  }}
                >
                  <option value="" ?selected=${selectedPresetIndex < 0}>
                    ${t("configPage.acp.backendSelectPlaceholder")}
                  </option>
                  ${props.catalog.backends.map(
                    (entry, index) => html`
                      <option value=${String(index)} ?selected=${index === selectedPresetIndex}>
                        ${entry.id}
                      </option>
                    `,
                  )}
                </select>
              </label>
              ${renderBackendStatusHint(selectedEntry)}
            `
          : html`<p class="config-acp-picker__meta muted">${t("configPage.acp.backendCatalogEmpty")}</p>`
        : html`
            <label class="config-acp-custom-field">
              <span class="config-acp-custom-field__label">${t("configPage.acp.customBackendLabel")}</span>
              <input
                class="cfg-input"
                type="text"
                .value=${customDraft}
                ?disabled=${props.disabled}
                placeholder=${t("configPage.acp.customBackendPlaceholder")}
                @input=${(event: Event) => {
                  const value = (event.target as HTMLInputElement).value.trim();
                  props.onPatch(["acp", "backend"], value || undefined);
                }}
              />
            </label>
            ${renderBackendStatusHint(selectedEntry)}
          `}
      <label class="cfg-toggle-row config-acp-custom-toggle ${props.disabled ? "disabled" : ""}">
        <div class="cfg-toggle-row__content">
          <span class="cfg-toggle-row__label">${t("configPage.acp.customBackendToggle")}</span>
        </div>
        <div class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${useCustom}
            ?disabled=${props.disabled}
            @change=${(event: Event) => {
              const checked = (event.target as HTMLInputElement).checked;
              acpBackendCustomMode = checked;
              if (!checked) {
                const current = props.backend?.trim() ?? "";
                if (!current || !presetIds.includes(current)) {
                  props.onPatch(["acp", "backend"], undefined);
                }
              }
              props.onRequestUpdate?.();
            }}
          />
          <span class="cfg-toggle__track"></span>
        </div>
      </label>
    </section>
  `;
}

export function renderAcpDefaultAgentPicker(props: AcpPickerProps): TemplateResult {
  const selected = props.defaultAgent?.trim() || "";
  const help = hintForPath(["acp", "defaultAgent"], props.uiHints)?.help;
  const presetIds = props.catalog.harnessIds;
  const presetSet = new Set(presetIds);
  const showCustomSelected = Boolean(selected) && !presetSet.has(selected);
  return html`
    <section class="config-memory-group">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">${t("configPage.acp.defaultAgentTitle")}</h4>
        ${help ? html`<p class="config-memory-group__hint">${help}</p>` : nothing}
      </div>
      <div class="config-acp-harness-grid">
        ${presetIds.map(
          (harnessId) => html`
            <button
              type="button"
              class="config-acp-harness-chip ${selected === harnessId ? "config-acp-harness-chip--active" : ""}"
              ?disabled=${props.disabled}
              @click=${() => props.onPatch(["acp", "defaultAgent"], harnessId)}
            >
              ${harnessId}
            </button>
          `,
        )}
      </div>
      <label class="config-acp-custom-field">
        <span class="config-acp-custom-field__label">${t("configPage.acp.customHarnessLabel")}</span>
        <input
          class="cfg-input"
          type="text"
          .value=${showCustomSelected ? selected : ""}
          ?disabled=${props.disabled}
          placeholder=${t("configPage.acp.customHarnessPlaceholder")}
          @input=${(event: Event) => {
            const value = (event.target as HTMLInputElement).value.trim();
            props.onPatch(["acp", "defaultAgent"], value || undefined);
          }}
        />
      </label>
    </section>
  `;
}

export function renderAcpAllowedAgentsPicker(props: AcpPickerProps): TemplateResult {
  const selected = normalizeStringArray(props.allowedAgents);
  const selectedSet = new Set(selected);
  const help = hintForPath(["acp", "allowedAgents"], props.uiHints)?.help;
  const presetIds = props.catalog.harnessIds;
  const customSelected = selected.filter((harnessId) => !props.catalog.harnessIds.includes(harnessId));

  const toggleHarness = (harnessId: string) => {
    const next = new Set(selectedSet);
    if (next.has(harnessId)) {
      next.delete(harnessId);
    } else {
      next.add(harnessId);
    }
    props.onPatch(["acp", "allowedAgents"], [...next].toSorted((left, right) => left.localeCompare(right)));
  };

  return html`
    <section class="config-memory-group">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">${t("configPage.acp.allowedAgentsTitle")}</h4>
        ${help ? html`<p class="config-memory-group__hint">${help}</p>` : nothing}
      </div>
      <div class="config-acp-harness-grid">
        ${presetIds.map(
          (harnessId) => html`
            <button
              type="button"
              class="config-acp-harness-chip ${selectedSet.has(harnessId)
                ? "config-acp-harness-chip--active"
                : ""}"
              ?disabled=${props.disabled}
              @click=${() => toggleHarness(harnessId)}
            >
              ${harnessId}
            </button>
          `,
        )}
      </div>
      ${customSelected.length > 0
        ? html`
            <div class="config-acp-custom-tags">
              ${customSelected.map(
                (harnessId) => html`
                  <span class="config-acp-custom-tag">
                    ${harnessId}
                    <button
                      type="button"
                      class="config-acp-custom-tag__remove"
                      ?disabled=${props.disabled}
                      @click=${() => toggleHarness(harnessId)}
                      aria-label=${t("configPage.acp.removeCustomHarness", { harnessId })}
                    >
                      ×
                    </button>
                  </span>
                `,
              )}
            </div>
          `
        : nothing}
      <div class="config-acp-custom-add">
        <input
          id="acp-custom-harness-input"
          class="cfg-input"
          type="text"
          ?disabled=${props.disabled}
          placeholder=${t("configPage.acp.addCustomHarnessPlaceholder")}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            const input = event.target as HTMLInputElement;
            const value = input.value.trim();
            if (!value || selectedSet.has(value)) {
              input.value = "";
              return;
            }
            toggleHarness(value);
            input.value = "";
          }}
        />
        <button
          type="button"
          class="btn btn--sm"
          ?disabled=${props.disabled}
          @click=${() => {
            const input = document.getElementById("acp-custom-harness-input") as HTMLInputElement | null;
            const value = input?.value.trim() ?? "";
            if (!value || selectedSet.has(value)) {
              if (input) {
                input.value = "";
              }
              return;
            }
            toggleHarness(value);
            if (input) {
              input.value = "";
            }
          }}
        >
          ${t("configPage.acp.addCustomHarness")}
        </button>
      </div>
    </section>
  `;
}
