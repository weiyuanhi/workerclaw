// Renders channels as a list; edit opens the shared channel config modal.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { ConfigUiHints } from "../types.ts";
import { openChannelConfigModal } from "./channels-config-modal.ts";
import {
  buildChannelConfigSummaryRows,
  type ChannelConfigSummaryRow,
} from "./channels-config-summary.ts";
import { pathKey, humanize, hintForPath, schemaType, type JsonSchema } from "./config-form.shared.ts";
import type { ConfigSearchCriteria } from "./config-form.node.ts";

export type ChannelListRow = {
  id: string;
  label: string;
  configured: boolean;
  summaryRows: ChannelConfigSummaryRow[];
};

export function isChannelsMapPath(path: Array<string | number>): boolean {
  return pathKey(path) === "channels";
}

function resolveChannelLabel(
  channelId: string,
  schema: JsonSchema,
  hints: ConfigUiHints,
): string {
  const hint = hintForPath(["channels", channelId], hints);
  if (hint?.label) {
    return hint.label;
  }
  const node = schema.properties?.[channelId];
  if (node?.title) {
    return node.title;
  }
  return humanize(channelId);
}

export function buildChannelListRows(params: {
  schema: JsonSchema;
  configured: Record<string, unknown>;
  hints: ConfigUiHints;
}): ChannelListRow[] {
  const schemaKeys = Object.keys(params.schema.properties ?? {});
  const valueKeys = Object.keys(params.configured ?? {});
  const channelIds = [...new Set([...schemaKeys, ...valueKeys])].toSorted((left, right) => {
    const leftLabel = resolveChannelLabel(left, params.schema, params.hints);
    const rightLabel = resolveChannelLabel(right, params.schema, params.hints);
    return leftLabel.localeCompare(rightLabel);
  });

  return channelIds.map((id) => ({
    id,
    label: resolveChannelLabel(id, params.schema, params.hints),
    configured: Object.hasOwn(params.configured, id) && params.configured[id] != null,
    summaryRows: buildChannelConfigSummaryRows({
      channelId: id,
      configForm: { channels: params.configured },
      hints: params.hints,
    }),
  }));
}

function renderConfiguredPill(configured: boolean) {
  const className = configured
    ? "cfg-provider-row__pill cfg-provider-row__pill--ok"
    : "cfg-provider-row__pill cfg-provider-row__pill--missing";
  return html`<span class=${className}>
    ${configured ? t("channels.config.summaryConfigured") : t("channels.config.summaryNotSet")}
  </span>`;
}

function renderSummaryLine(rows: ChannelConfigSummaryRow[]) {
  if (rows.length === 0) {
    return html`<div class="cfg-channel-row__summary cfg-channel-row__summary--empty muted">
      ${t("channels.config.noConfig")}
    </div>`;
  }
  return html`
    <div class="cfg-channel-row__summary">
      ${rows.map(
        (row, index) => html`
          ${index > 0 ? html`<span class="cfg-channel-row__sep">·</span>` : nothing}
          <span class="cfg-channel-row__pair"
            ><span class="cfg-channel-row__key">${row.label}</span>
            <span class="cfg-channel-row__val">${row.value}</span></span
          >
        `,
      )}
    </div>
  `;
}

export function renderChannelsMapField(params: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  path: Array<string | number>;
  hints: ConfigUiHints;
  rawAvailable?: boolean;
  unsupported: Set<string>;
  disabled: boolean;
  searchCriteria?: ConfigSearchCriteria;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
}): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch, onRequestUpdate } = params;
  const configured = value ?? {};
  const rows = buildChannelListRows({ schema, configured, hints });
  const wrappedSchema: JsonSchema = {
    type: "object",
    properties: { channels: schema },
  };

  return html`
    <div class="cfg-map cfg-map--channels">
      <div class="cfg-map__header">
        <span class="cfg-map__label">${t("configPage.sectionsMeta.channels.label")}</span>
      </div>

      ${rows.length === 0
        ? html`<div class="cfg-map__empty">${t("channels.config.noConfig")}</div>`
        : html`
            <div class="cfg-map__items cfg-map__items--channels">
              ${rows.map(
                (row) => html`
                  <div class="cfg-map__item cfg-provider-row cfg-channel-row" data-channel-id=${row.id}>
                    <div class="cfg-provider-row__header">
                      <div class="cfg-provider-row__summary cfg-provider-row__summary--static">
                        <span class="cfg-provider-row__title">${row.label}</span>
                        <span class="cfg-provider-row__id">${row.id}</span>
                        ${renderConfiguredPill(row.configured)}
                      </div>
                      <div class="cfg-provider-row__actions">
                        <button
                          type="button"
                          class="btn btn--sm"
                          data-channel-config-edit=${row.id}
                          ?disabled=${disabled}
                          @click=${() => {
                            openChannelConfigModal({
                              channelId: row.id,
                              channelLabel: row.label,
                              configValue: { channels: configured },
                              schema: wrappedSchema,
                              uiHints: hints,
                              disabled,
                              onPatch,
                            });
                            onRequestUpdate?.();
                          }}
                        >
                          ${t("channels.config.editConfig")}
                        </button>
                        ${row.configured
                          ? html`<button
                              type="button"
                              class="cfg-map__item-remove"
                              title=${t("configPage.form.removeEntry")}
                              ?disabled=${disabled}
                              @click=${() => {
                                const next = { ...configured };
                                delete next[row.id];
                                onPatch(path, next);
                                onRequestUpdate?.();
                              }}
                            >
                              ${icons.trash}
                            </button>`
                          : nothing}
                      </div>
                    </div>
                    ${renderSummaryLine(row.summaryRows)}
                  </div>
                `,
              )}
            </div>
          `}
    </div>
  `;
}

export function isChannelsObjectSchema(schema: JsonSchema): boolean {
  return schemaType(schema) === "object";
}
