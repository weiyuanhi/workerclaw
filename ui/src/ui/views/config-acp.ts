// Progressive ACP settings UI — required fields in basics, optional tuning in advanced.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import type { AcpSetupCatalog } from "../../../../src/shared/acp-setup-catalog.ts";
import type { ConfigUiHints } from "../types.ts";
import { renderNode } from "./config-form.node.ts";
import { schemaType, type JsonSchema } from "./config-form.shared.ts";
import {
  renderAcpAllowedAgentsPicker,
  renderAcpBackendPicker,
  renderAcpDefaultAgentPicker,
} from "./config-acp-pickers.ts";
import { renderAcpWorkspaceSection } from "./config-acp-workspace.ts";

export type AcpConfigSectionProps = {
  schema: JsonSchema | null;
  uiHints: ConfigUiHints;
  value: Record<string, unknown> | null;
  disabled?: boolean;
  unsupportedPaths?: string[];
  catalog: AcpSetupCatalog;
  catalogLoading?: boolean;
  catalogError?: string | null;
  defaultAgentId?: string | null;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onSectionChange?: (section: string | null) => void;
  onRequestUpdate?: () => void;
};

type AcpRecord = Record<string, unknown>;

export const ACP_BASIC_FIELD_KEYS = [
  "enabled",
  "backend",
  "defaultAgent",
  "allowedAgents",
] as const;

export const ACP_DISPATCH_FIELD_KEYS = ["enabled"] as const;

export const ACP_ADVANCED_TOP_LEVEL_KEYS = ["fallbacks", "maxConcurrentSessions"] as const;

export const ACP_STREAM_FIELD_KEYS = [
  "deliveryMode",
  "coalesceIdleMs",
  "maxChunkChars",
  "maxOutputChars",
  "maxSessionUpdateChars",
  "repeatSuppression",
  "hiddenBoundarySeparator",
  "tagVisibility",
] as const;

export const ACP_RUNTIME_FIELD_KEYS = ["ttlMinutes", "installCommand"] as const;

function asRecord(value: unknown): AcpRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AcpRecord) : {};
}

function acpSchemaNode(schema: JsonSchema | null): JsonSchema | null {
  if (!schema || schemaType(schema) !== "object" || !schema.properties?.acp) {
    return null;
  }
  return schema.properties.acp;
}

function renderField(params: {
  fieldKey: string;
  parentPath: Array<string | number>;
  parentSchema: JsonSchema;
  parentValue: AcpRecord;
  props: AcpConfigSectionProps;
  unsupported: Set<string>;
}): TemplateResult | typeof nothing {
  const node = params.parentSchema.properties?.[params.fieldKey];
  if (!node) {
    return nothing;
  }
  return renderNode({
    schema: node,
    value: params.parentValue[params.fieldKey],
    path: [...params.parentPath, params.fieldKey],
    hints: params.props.uiHints,
    rawAvailable: true,
    unsupported: params.unsupported,
    disabled: params.props.disabled ?? false,
    onPatch: params.props.onPatch,
  });
}

function renderNestedFields(params: {
  objectKey: string;
  propertyKeys: readonly string[];
  parentPath: Array<string | number>;
  parentSchema: JsonSchema;
  parentValue: AcpRecord;
  props: AcpConfigSectionProps;
  unsupported: Set<string>;
}): Array<TemplateResult | typeof nothing> {
  const objectSchema = params.parentSchema.properties?.[params.objectKey];
  if (!objectSchema || schemaType(objectSchema) !== "object") {
    return [];
  }
  const objectValue = asRecord(params.parentValue[params.objectKey]);
  return params.propertyKeys.map((propertyKey) =>
    renderField({
      fieldKey: propertyKey,
      parentPath: [...params.parentPath, params.objectKey],
      parentSchema: objectSchema,
      parentValue: objectValue,
      props: params.props,
      unsupported: params.unsupported,
    }),
  );
}

function renderFieldGroup(params: {
  title: string;
  hint?: string;
  fields: Array<TemplateResult | typeof nothing>;
}): TemplateResult | typeof nothing {
  const visibleFields = params.fields.filter((field) => field !== nothing);
  if (visibleFields.length === 0) {
    return nothing;
  }
  return html`
    <section class="config-memory-group">
      ${params.title
        ? html`
            <div class="config-memory-group__header">
              <h4 class="config-memory-group__title">${params.title}</h4>
              ${params.hint ? html`<p class="config-memory-group__hint">${params.hint}</p>` : nothing}
            </div>
          `
        : nothing}
      <div class="config-memory-group__fields cfg-fields">${visibleFields}</div>
    </section>
  `;
}

function renderPluginCallout(props: AcpConfigSectionProps): TemplateResult {
  return html`
    <div class="callout info config-memory-callout">
      <div class="config-memory-callout__title">${t("configPage.acp.pluginCalloutTitle")}</div>
      <p class="config-memory-callout__body">${t("configPage.acp.pluginCalloutBody")}</p>
      ${props.onSectionChange
        ? html`
            <button
              type="button"
              class="btn btn--sm"
              @click=${() => props.onSectionChange?.("plugins")}
            >
              ${t("configPage.acp.goToPlugins")}
            </button>
          `
        : nothing}
    </div>
  `;
}

export function isAcpAdvancedPath(path: string): boolean {
  if (path === "acp") {
    return false;
  }
  if (!path.startsWith("acp.")) {
    return false;
  }
  const suffix = path.slice("acp.".length);
  if (ACP_BASIC_FIELD_KEYS.includes(suffix as (typeof ACP_BASIC_FIELD_KEYS)[number])) {
    return false;
  }
  if (suffix === "dispatch.enabled") {
    return false;
  }
  return true;
}

export function renderAcpConfigSection(props: AcpConfigSectionProps): TemplateResult {
  const acpSchema = acpSchemaNode(props.schema);
  if (!acpSchema || schemaType(acpSchema) !== "object") {
    return html`<div class="muted">${t("configPage.form.schemaUnavailable")}</div>`;
  }

  const acpValue = asRecord(props.value?.acp);
  const unsupported = new Set(props.unsupportedPaths ?? []);

  const dispatchFields = renderNestedFields({
    objectKey: "dispatch",
    propertyKeys: ACP_DISPATCH_FIELD_KEYS,
    parentPath: ["acp"],
    parentSchema: acpSchema,
    parentValue: acpValue,
    props,
    unsupported,
  });

  const streamSchema = acpSchema.properties?.stream;
  const streamValue = asRecord(acpValue.stream);
  const runtimeSchema = acpSchema.properties?.runtime;
  const runtimeValue = asRecord(acpValue.runtime);
  const pickerProps = {
    catalog: props.catalog,
    catalogLoading: props.catalogLoading,
    uiHints: props.uiHints,
    disabled: props.disabled,
    backend: typeof acpValue.backend === "string" ? acpValue.backend : undefined,
    defaultAgent: typeof acpValue.defaultAgent === "string" ? acpValue.defaultAgent : undefined,
    allowedAgents: Array.isArray(acpValue.allowedAgents) ? acpValue.allowedAgents : undefined,
    onPatch: props.onPatch,
    onRequestUpdate: props.onRequestUpdate,
  };

  return html`
    <div class="config-acp">
      ${props.catalogError
        ? html`<div class="callout warn config-acp-catalog-error">${props.catalogError}</div>`
        : nothing}
      ${renderFieldGroup({
        title: t("configPage.acp.basicsTitle"),
        hint: t("configPage.acp.basicsHint"),
        fields: [
          renderField({
            fieldKey: "enabled",
            parentPath: ["acp"],
            parentSchema: acpSchema,
            parentValue: acpValue,
            props,
            unsupported,
          }),
          ...dispatchFields,
        ],
      })}
      ${renderAcpBackendPicker(pickerProps)}
      ${renderAcpDefaultAgentPicker(pickerProps)}
      ${renderAcpAllowedAgentsPicker(pickerProps)}
      ${renderAcpWorkspaceSection({
        value: props.value,
        defaultAgentId: props.defaultAgentId,
        disabled: props.disabled,
        onPatch: props.onPatch,
        onSectionChange: props.onSectionChange,
      })}
      ${renderPluginCallout(props)}
      <details class="config-memory-advanced">
        <summary class="config-memory-advanced__summary">${t("configPage.acp.advancedTitle")}</summary>
        <p class="config-memory-advanced__hint">${t("configPage.acp.advancedHint")}</p>
        ${renderFieldGroup({
          title: "",
          fields: ACP_ADVANCED_TOP_LEVEL_KEYS.map((fieldKey) =>
            renderField({
              fieldKey,
              parentPath: ["acp"],
              parentSchema: acpSchema,
              parentValue: acpValue,
              props,
              unsupported,
            }),
          ),
        })}
        ${streamSchema && schemaType(streamSchema) === "object"
          ? renderFieldGroup({
              title: t("configPage.acp.streamTitle"),
              hint: t("configPage.acp.streamHint"),
              fields: ACP_STREAM_FIELD_KEYS.map((fieldKey) =>
                renderField({
                  fieldKey,
                  parentPath: ["acp", "stream"],
                  parentSchema: streamSchema,
                  parentValue: streamValue,
                  props,
                  unsupported,
                }),
              ),
            })
          : nothing}
        ${runtimeSchema && schemaType(runtimeSchema) === "object"
          ? renderFieldGroup({
              title: t("configPage.acp.runtimeTitle"),
              hint: t("configPage.acp.runtimeHint"),
              fields: ACP_RUNTIME_FIELD_KEYS.map((fieldKey) =>
                renderField({
                  fieldKey,
                  parentPath: ["acp", "runtime"],
                  parentSchema: runtimeSchema,
                  parentValue: runtimeValue,
                  props,
                  unsupported,
                }),
              ),
            })
          : nothing}
      </details>
    </div>
  `;
}
