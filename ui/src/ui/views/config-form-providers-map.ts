// Renders models.providers as a list; edit opens a dedicated panel by provider kind.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { ModelAuthStatusProvider } from "../types.ts";
import { humanize } from "./config-form.shared.ts";
import {
  cancelModelProviderEditPanel,
  openModelProviderEditPanel,
} from "./config-form-provider-edit.ts";
import { openModelProviderCreateModal } from "./config-form-provider-modal.ts";
import {
  inferModelProviderKind,
  resolveCloudModelProviderPreset,
  resolveLocalModelProviderPreset,
} from "./config-form-provider-presets.ts";
import type { ConfigUiHints, ModelCatalogEntry } from "../types.ts";
import type { JsonSchema } from "./config-form.shared.ts";
import { collectChatVisibleProviderIds } from "./config-form-provider-sync.ts";

export type ConfigSearchCriteria = import("./config-form.node.ts").ConfigSearchCriteria;

export type RenderProviderEntry = (params: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  path: Array<string | number>;
  hints: ConfigUiHints;
  rawAvailable?: boolean;
  unsupported: Set<string>;
  disabled: boolean;
  searchCriteria?: ConfigSearchCriteria;
  revealSensitive?: boolean;
  isSensitivePathRevealed?: (path: Array<string | number>) => boolean;
  onToggleSensitivePath?: (path: Array<string | number>) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}) => TemplateResult | typeof nothing;

export type ModelProviderListRow = {
  id: string;
  displayName: string;
  kind: ReturnType<typeof inferModelProviderKind>;
  authStatus?: ModelAuthStatusProvider["status"];
};

export type ModelProvidersMapContext = {
  authProviders?: ModelAuthStatusProvider[];
  modelCatalog?: ModelCatalogEntry[];
  onRemoveProvider?: (providerId: string) => void | Promise<void>;
};

let providersMapContext: ModelProvidersMapContext = {};

export function bindModelProvidersMapContext(context: ModelProvidersMapContext) {
  providersMapContext = context;
}

export function resetModelProvidersMapExpandedState() {
  cancelModelProviderEditPanel();
}

function resolveProviderDisplayName(
  id: string,
  authLookup: Map<string, ModelAuthStatusProvider>,
): string {
  const auth = authLookup.get(id);
  if (auth?.displayName) {
    return auth.displayName;
  }
  const cloud = resolveCloudModelProviderPreset(id);
  if (cloud) {
    return t(cloud.labelKey);
  }
  const local = resolveLocalModelProviderPreset(id);
  if (local) {
    return t(local.labelKey);
  }
  return humanize(id);
}

export function buildModelProviderListRows(params: {
  configured: Record<string, unknown>;
  authProviders?: ModelAuthStatusProvider[];
  modelCatalog?: ModelCatalogEntry[];
}): ModelProviderListRow[] {
  const authLookup = new Map<string, ModelAuthStatusProvider>();
  for (const provider of params.authProviders ?? []) {
    authLookup.set(provider.provider, provider);
  }

  const catalogIds = collectChatVisibleProviderIds(params.modelCatalog);
  const providerIds =
    catalogIds.length > 0
      ? catalogIds
      : Object.keys(params.configured ?? {}).toSorted((left, right) => left.localeCompare(right));

  return providerIds
    .toSorted((left, right) => {
      const leftLabel = resolveProviderDisplayName(left, authLookup);
      const rightLabel = resolveProviderDisplayName(right, authLookup);
      return leftLabel.localeCompare(rightLabel);
    })
    .map((id) => {
      const entryValue = params.configured?.[id];
      const entry =
        entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)
          ? (entryValue as Record<string, unknown>)
          : {};
      return {
        id,
        displayName: resolveProviderDisplayName(id, authLookup),
        kind: inferModelProviderKind(id, entry),
        authStatus: authLookup.get(id)?.status,
      };
    });
}

function renderAuthStatusPill(status: ModelAuthStatusProvider["status"] | undefined) {
  if (!status) {
    return nothing;
  }
  const className =
    status === "ok" || status === "static"
      ? "cfg-provider-row__pill cfg-provider-row__pill--ok"
      : status === "missing"
        ? "cfg-provider-row__pill cfg-provider-row__pill--missing"
        : "cfg-provider-row__pill cfg-provider-row__pill--warn";
  return html`<span class=${className}>${t(`configPage.modelsProviderModal.authStatus.${status}`)}</span>`;
}

function renderKindPill(kind: ModelProviderListRow["kind"]) {
  return html`<span class="cfg-provider-row__pill cfg-provider-row__pill--configured">
    ${t(`configPage.modelsProviderModal.kinds.${kind}`)}
  </span>`;
}

export function renderModelProvidersMapField(params: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  path: Array<string | number>;
  hints: ConfigUiHints;
  rawAvailable?: boolean;
  unsupported: Set<string>;
  disabled: boolean;
  searchCriteria?: ConfigSearchCriteria;
  revealSensitive?: boolean;
  isSensitivePathRevealed?: (path: Array<string | number>) => boolean;
  onToggleSensitivePath?: (path: Array<string | number>) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
  renderEntry: RenderProviderEntry;
}): TemplateResult {
  const {
    schema,
    value,
    path,
    hints,
    rawAvailable,
    unsupported,
    disabled,
    onPatch,
    onRequestUpdate,
  } = params;

  const configured = value ?? {};
  const rows = buildModelProviderListRows({
    configured,
    authProviders: providersMapContext.authProviders,
    modelCatalog: providersMapContext.modelCatalog,
  });

  return html`
    <div class="cfg-map cfg-map--providers">
      <div class="cfg-map__header">
        <span class="cfg-map__label">${t("configPage.modelsProviderModal.sectionLabel")}</span>
        <button
          type="button"
          class="cfg-map__add"
          data-model-provider-add="true"
          ?disabled=${disabled}
          @click=${() => {
            openModelProviderCreateModal({
              path,
              schema,
              value: configured,
              hints,
              unsupported,
              rawAvailable,
              disabled,
              onPatch,
            });
          }}
        >
          <span class="cfg-map__add-icon">${icons.plus}</span>
          ${t("configPage.modelsProviderModal.addProvider")}
        </button>
      </div>

      ${rows.length === 0
        ? html`<div class="cfg-map__empty">${t("configPage.modelsProviderModal.noProviders")}</div>`
        : html`
            <div class="cfg-map__items cfg-map__items--providers">
              ${rows.map((row) => html`
                <div class="cfg-map__item cfg-provider-row" data-provider-id=${row.id}>
                  <div class="cfg-provider-row__header">
                    <div class="cfg-provider-row__summary cfg-provider-row__summary--static">
                      <span class="cfg-provider-row__title">${row.displayName}</span>
                      <span class="cfg-provider-row__id">${row.id}</span>
                      ${renderKindPill(row.kind)}
                      ${renderAuthStatusPill(row.authStatus)}
                    </div>
                    <div class="cfg-provider-row__actions">
                      <button
                        type="button"
                        class="btn btn--sm"
                        data-model-provider-edit=${row.id}
                        ?disabled=${disabled}
                        @click=${() => {
                          openModelProviderEditPanel(
                            {
                              path,
                              schema,
                              value: configured,
                              hints,
                              unsupported,
                              rawAvailable,
                              disabled,
                              onPatch,
                            },
                            row.id,
                          );
                          onRequestUpdate?.();
                        }}
                      >
                        ${t("configPage.modelsProviderModal.editProvider")}
                      </button>
                      <button
                        type="button"
                        class="cfg-map__item-remove"
                        title=${t("configPage.form.removeEntry")}
                        ?disabled=${disabled}
                        @click=${() => {
                          void (async () => {
                            if (providersMapContext.onRemoveProvider) {
                              await providersMapContext.onRemoveProvider(row.id);
                            } else {
                              const next = { ...configured };
                              delete next[row.id];
                              onPatch(path, next);
                            }
                            onRequestUpdate?.();
                          })();
                        }}
                      >
                        ${icons.trash}
                      </button>
                    </div>
                  </div>
                </div>
              `)}
            </div>
          `}
    </div>
  `;
}
