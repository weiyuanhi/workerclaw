// Control UI view renders channels screen content.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type { ConfigUiHints } from "../types.ts";
import { formatChannelExtraValue, resolveChannelConfigValue } from "./channel-config-extras.ts";
import { openChannelConfigModal } from "./channels-config-modal.ts";
import { buildChannelConfigSummaryRows } from "./channels-config-summary.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { analyzeConfigSchema, renderNode, schemaType, type JsonSchema } from "./config-form.ts";

type ChannelConfigFormProps = {
  channelId: string;
  configValue: Record<string, unknown> | null;
  schema: unknown;
  uiHints: ConfigUiHints;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
};

export function resolveChannelSchemaNode(
  schema: JsonSchema | null,
  channelId: string,
): JsonSchema | null {
  if (!schema || schemaType(schema) !== "object" || !schema.properties) {
    return null;
  }
  const channelsNode = schema.properties.channels;
  if (!channelsNode || schemaType(channelsNode) !== "object") {
    return null;
  }
  const channelNode = channelsNode.properties?.[channelId];
  if (channelNode) {
    return channelNode;
  }
  const additional = channelsNode.additionalProperties;
  return additional && typeof additional === "object" ? additional : null;
}

function resolveSchemaNode(
  schema: JsonSchema | null,
  path: Array<string | number>,
): JsonSchema | null {
  let current = schema;
  for (const key of path) {
    if (!current) {
      return null;
    }
    const type = schemaType(current);
    if (type === "object") {
      const properties = current.properties ?? {};
      if (typeof key === "string" && properties[key]) {
        current = properties[key];
        continue;
      }
      const additional = current.additionalProperties;
      if (typeof key === "string" && additional && typeof additional === "object") {
        current = additional;
        continue;
      }
      return null;
    }
    if (type === "array") {
      if (typeof key !== "number") {
        return null;
      }
      const items = Array.isArray(current.items) ? current.items[0] : current.items;
      current = items ?? null;
      continue;
    }
    return null;
  }
  return current;
}

function resolveChannelValue(
  config: Record<string, unknown>,
  channelId: string,
): Record<string, unknown> {
  return resolveChannelConfigValue(config, channelId) ?? {};
}

const EXTRA_CHANNEL_FIELDS = ["groupPolicy", "streamMode", "dmPolicy"] as const;

function renderExtraChannelFields(value: Record<string, unknown>) {
  const entries = EXTRA_CHANNEL_FIELDS.flatMap((field) => {
    if (!(field in value)) {
      return [];
    }
    return [[field, value[field]]] as Array<[string, unknown]>;
  });
  if (entries.length === 0) {
    return null;
  }
  return html`
    <div class="status-list" style="margin-top: 12px;">
      ${entries.map(
        ([field, raw]) => html`
          <div>
            <span class="label">${field}</span>
            <span>${formatChannelExtraValue(raw)}</span>
          </div>
        `,
      )}
    </div>
  `;
}

export function renderChannelConfigForm(props: ChannelConfigFormProps) {
  const analysis = analyzeConfigSchema(props.schema);
  const normalized = analysis.schema;
  if (!normalized) {
    return html` <div class="callout danger">${t("channels.config.schemaUnavailable")}</div> `;
  }
  const node = resolveSchemaNode(normalized, ["channels", props.channelId]);
  if (!node) {
    return html` <div class="callout danger">${t("channels.config.channelSchemaUnavailable")}</div> `;
  }
  const configValue = props.configValue ?? {};
  const value = resolveChannelValue(configValue, props.channelId);
  return html`
    <div class="config-form">
      ${renderNode({
        schema: node,
        value,
        path: ["channels", props.channelId],
        hints: props.uiHints,
        unsupported: new Set(analysis.unsupportedPaths),
        disabled: props.disabled,
        showLabel: false,
        onPatch: props.onPatch,
      })}
    </div>
    ${renderExtraChannelFields(value)}
  `;
}

function renderChannelConfigSummaryList(params: {
  channelId: string;
  channelLabel: string;
  props: ChannelsProps;
  disabled: boolean;
}) {
  const { channelId, channelLabel, props, disabled } = params;
  const rows = buildChannelConfigSummaryRows({
    channelId,
    configForm: props.configForm,
    hints: props.configUiHints,
  });
  const schemaAvailable = Boolean(resolveChannelSchemaNode(analyzeConfigSchema(props.configSchema).schema, channelId));

  return html`
    <div class="cfg-map cfg-map--channel-config" style="margin-top: 16px;">
      <div class="cfg-map__header">
        <span class="cfg-map__label">${t("channels.config.sectionLabel")}</span>
        <button
          type="button"
          class="btn btn--sm"
          data-channel-config-edit=${channelId}
          ?disabled=${disabled || !schemaAvailable}
          @click=${() => {
            openChannelConfigModal({
              channelId,
              channelLabel,
              configValue: props.configForm,
              schema: props.configSchema,
              uiHints: props.configUiHints,
              disabled,
              onPatch: props.onConfigPatch,
            });
            props.onRequestUpdate?.();
          }}
        >
          ${t("channels.config.editConfig")}
        </button>
      </div>

      ${props.configSchemaLoading
        ? html`<div class="cfg-map__empty">${t("channels.config.loadingSchema")}</div>`
        : rows.length === 0
          ? html`<div class="cfg-map__empty">${t("channels.config.noConfig")}</div>`
          : html`
              <div class="cfg-map__items cfg-map__items--channel-config">
                ${rows.map(
                  (row) => html`
                    <div class="cfg-map__item cfg-channel-config-row" data-field=${row.key}>
                      <div class="cfg-channel-config-row__label">${row.label}</div>
                      <div class="cfg-channel-config-row__value">${row.value}</div>
                    </div>
                  `,
                )}
              </div>
            `}
    </div>
  `;
}

export function renderChannelConfigSection(params: {
  channelId: string;
  channelLabel?: string;
  props: ChannelsProps;
}) {
  const { channelId, props } = params;
  const disabled = props.configSaving || props.configSchemaLoading;
  const channelLabel =
    params.channelLabel ??
    props.snapshot?.channelLabels?.[channelId] ??
    props.snapshot?.channelMeta?.find((entry) => entry.id === channelId)?.label ??
    channelId;

  return html`
    ${renderChannelConfigSummaryList({ channelId, channelLabel, props, disabled })}
    <div class="row" style="margin-top: 12px;">
      <button
        class="btn primary"
        ?disabled=${disabled || !props.configFormDirty}
        @click=${() => props.onConfigSave()}
      >
        ${props.configSaving ? t("common.saving") : t("common.save")}
      </button>
      <button class="btn" ?disabled=${disabled} @click=${() => props.onConfigReload()}>
        ${t("common.reload")}
      </button>
    </div>
  `;
}
