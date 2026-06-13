// Progressive memory settings UI — surfaces options based on backend and nested choices.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { ConfigUiHints } from "../types.ts";
import { renderNode } from "./config-form.node.ts";
import { pathKey, schemaType, type JsonSchema } from "./config-form.shared.ts";

export type MemoryBackendChoice = "builtin" | "qmd";

export type MemoryConfigSectionProps = {
  schema: JsonSchema | null;
  uiHints: ConfigUiHints;
  value: Record<string, unknown> | null;
  disabled?: boolean;
  unsupportedPaths?: string[];
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onSectionChange?: (section: string | null) => void;
};

type MemoryRecord = Record<string, unknown>;

function asRecord(value: unknown): MemoryRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as MemoryRecord) : {};
}

export function resolveMemoryBackend(memory: MemoryRecord | undefined): MemoryBackendChoice {
  return memory?.backend === "qmd" ? "qmd" : "builtin";
}

export function resolveQmdSearchMode(memory: MemoryRecord | undefined): string {
  const qmd = asRecord(memory?.qmd);
  const mode = qmd.searchMode;
  return mode === "query" || mode === "vsearch" ? mode : "search";
}

function resolveQmd(memory: MemoryRecord | undefined): MemoryRecord {
  return asRecord(memory?.qmd);
}

function resolveQmdMcporter(memory: MemoryRecord | undefined): MemoryRecord {
  return asRecord(resolveQmd(memory).mcporter);
}

function resolveQmdSessions(memory: MemoryRecord | undefined): MemoryRecord {
  return asRecord(resolveQmd(memory).sessions);
}

function resolveQmdUpdate(memory: MemoryRecord | undefined): MemoryRecord {
  return asRecord(resolveQmd(memory).update);
}

/** Controls which memory.* fields appear for the current backend and nested toggles. */
export function shouldShowMemoryField(path: string, memory: MemoryRecord | undefined): boolean {
  const backend = resolveMemoryBackend(memory);

  if (path === "memory" || path === "memory.backend" || path === "memory.citations") {
    return true;
  }

  if (!path.startsWith("memory.qmd")) {
    return false;
  }

  if (backend !== "qmd") {
    return false;
  }

  const searchMode = resolveQmdSearchMode(memory);
  const mcporterEnabled = resolveQmdMcporter(memory).enabled === true;
  const sessionsEnabled = resolveQmdSessions(memory).enabled === true;
  const startup = resolveQmdUpdate(memory).startup ?? "off";

  if (path === "memory.qmd.rerank") {
    return searchMode === "query";
  }
  if (path === "memory.qmd.searchTool") {
    return mcporterEnabled;
  }
  if (path === "memory.qmd.mcporter.serverName" || path === "memory.qmd.mcporter.startDaemon") {
    return mcporterEnabled;
  }
  if (path === "memory.qmd.update.embedInterval") {
    return searchMode !== "search";
  }
  if (path === "memory.qmd.sessions.exportDir" || path === "memory.qmd.sessions.retentionDays") {
    return sessionsEnabled;
  }
  if (path === "memory.qmd.update.startupDelayMs") {
    return startup === "idle";
  }

  return true;
}

function memorySchemaNode(schema: JsonSchema | null): JsonSchema | null {
  if (!schema || schemaType(schema) !== "object" || !schema.properties?.memory) {
    return null;
  }
  return schema.properties.memory;
}

function qmdSchemaNode(memorySchema: JsonSchema | null): JsonSchema | null {
  if (!memorySchema || schemaType(memorySchema) !== "object" || !memorySchema.properties?.qmd) {
    return null;
  }
  return memorySchema.properties.qmd;
}

function renderField(params: {
  fieldKey: string;
  parentPath: Array<string | number>;
  parentSchema: JsonSchema;
  parentValue: MemoryRecord;
  props: MemoryConfigSectionProps;
  unsupported: Set<string>;
}): TemplateResult | typeof nothing {
  const path = [...params.parentPath, params.fieldKey];
  const pathString = pathKey(path);
  if (!shouldShowMemoryField(pathString, params.props.value?.memory as MemoryRecord | undefined)) {
    return nothing;
  }
  const node = params.parentSchema.properties?.[params.fieldKey];
  if (!node) {
    return nothing;
  }
  return renderNode({
    schema: node,
    value: params.parentValue[params.fieldKey],
    path,
    hints: params.props.uiHints,
    rawAvailable: true,
    unsupported: params.unsupported,
    disabled: params.props.disabled ?? false,
    onPatch: params.props.onPatch,
  });
}

function renderNestedFields(params: {
  objectKey: string;
  propertyKeys: string[];
  parentPath: Array<string | number>;
  parentSchema: JsonSchema;
  parentValue: MemoryRecord;
  props: MemoryConfigSectionProps;
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

function renderFieldGroupFromFields(params: {
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

function renderBackendPicker(params: {
  backend: MemoryBackendChoice;
  disabled: boolean;
  onPatch: MemoryConfigSectionProps["onPatch"];
}): TemplateResult {
  const options: Array<{
    id: MemoryBackendChoice;
    title: string;
    description: string;
  }> = [
    {
      id: "builtin",
      title: t("configPage.memory.backendBuiltinTitle"),
      description: t("configPage.memory.backendBuiltinDesc"),
    },
    {
      id: "qmd",
      title: t("configPage.memory.backendQmdTitle"),
      description: t("configPage.memory.backendQmdDesc"),
    },
  ];

  return html`
    <section class="config-memory-group">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">${t("configPage.memory.backendTitle")}</h4>
        <p class="config-memory-group__hint">${t("configPage.memory.backendHint")}</p>
      </div>
      <div class="config-memory-backend-grid">
        ${options.map(
          (opt) => html`
            <button
              type="button"
              class="config-memory-backend-card ${params.backend === opt.id
                ? "config-memory-backend-card--active"
                : ""}"
              ?disabled=${params.disabled}
              @click=${() => {
                if (params.backend !== opt.id) {
                  params.onPatch(["memory", "backend"], opt.id);
                }
              }}
            >
              <span class="config-memory-backend-card__label">${opt.title}</span>
              <span class="config-memory-backend-card__desc">${opt.description}</span>
              ${params.backend === opt.id
                ? html`<span class="config-memory-backend-card__check" aria-hidden="true"
                    >${icons.check}</span
                  >`
                : nothing}
            </button>
          `,
        )}
      </div>
    </section>
  `;
}

function renderBuiltinPanel(params: {
  props: MemoryConfigSectionProps;
  memorySchema: JsonSchema;
  memoryValue: MemoryRecord;
  unsupported: Set<string>;
}): TemplateResult {
  return html`
    <div class="callout info config-memory-callout">
      <div class="config-memory-callout__title">${t("configPage.memory.builtinCalloutTitle")}</div>
      <p class="config-memory-callout__body">${t("configPage.memory.builtinCalloutBody")}</p>
      ${params.props.onSectionChange
        ? html`
            <button
              type="button"
              class="btn btn--sm"
              @click=${() => params.props.onSectionChange?.("agents")}
            >
              ${t("configPage.memory.goToAgents")}
            </button>
          `
        : nothing}
    </div>
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.citationsTitle"),
      hint: t("configPage.memory.citationsHint"),
      fields: [
        renderField({
          fieldKey: "citations",
          parentPath: ["memory"],
          parentSchema: params.memorySchema,
          parentValue: params.memoryValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ],
    })}
  `;
}

function renderQmdPanel(params: {
  props: MemoryConfigSectionProps;
  memorySchema: JsonSchema;
  memoryValue: MemoryRecord;
  qmdSchema: JsonSchema;
  qmdValue: MemoryRecord;
  unsupported: Set<string>;
}): TemplateResult {
  const searchMode = resolveQmdSearchMode(params.memoryValue);
  const searchHint =
    searchMode === "search"
      ? t("configPage.memory.qmdSearchLexicalHint")
      : searchMode === "vsearch"
        ? t("configPage.memory.qmdSearchVectorHint")
        : t("configPage.memory.qmdSearchQueryHint");

  return html`
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.citationsTitle"),
      hint: t("configPage.memory.citationsHint"),
      fields: [
        renderField({
          fieldKey: "citations",
          parentPath: ["memory"],
          parentSchema: params.memorySchema,
          parentValue: params.memoryValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ],
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdSetupTitle"),
      hint: t("configPage.memory.qmdSetupHint"),
      fields: ["command", "includeDefaultMemory"].map((fieldKey) =>
        renderField({
          fieldKey,
          parentPath: ["memory", "qmd"],
          parentSchema: params.qmdSchema,
          parentValue: params.qmdValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ),
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdSearchTitle"),
      hint: searchHint,
      fields: ["searchMode", "rerank", "searchTool"].map((fieldKey) =>
        renderField({
          fieldKey,
          parentPath: ["memory", "qmd"],
          parentSchema: params.qmdSchema,
          parentValue: params.qmdValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ),
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdIndexingTitle"),
      hint: t("configPage.memory.qmdIndexingHint"),
      fields: [
        renderField({
          fieldKey: "paths",
          parentPath: ["memory", "qmd"],
          parentSchema: params.qmdSchema,
          parentValue: params.qmdValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ],
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdSessionsTitle"),
      hint: t("configPage.memory.qmdSessionsHint"),
      fields: renderNestedFields({
        objectKey: "sessions",
        propertyKeys: ["enabled", "exportDir", "retentionDays"],
        parentPath: ["memory", "qmd"],
        parentSchema: params.qmdSchema,
        parentValue: params.qmdValue,
        props: params.props,
        unsupported: params.unsupported,
      }),
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdLimitsTitle"),
      fields: renderNestedFields({
        objectKey: "limits",
        propertyKeys: ["maxResults", "maxSnippetChars", "maxInjectedChars", "timeoutMs"],
        parentPath: ["memory", "qmd"],
        parentSchema: params.qmdSchema,
        parentValue: params.qmdValue,
        props: params.props,
        unsupported: params.unsupported,
      }),
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdUpdateTitle"),
      hint: t("configPage.memory.qmdUpdateHint"),
      fields: renderNestedFields({
        objectKey: "update",
        propertyKeys: [
          "interval",
          "debounceMs",
          "onBoot",
          "startup",
          "startupDelayMs",
          "waitForBootSync",
          "embedInterval",
          "commandTimeoutMs",
          "updateTimeoutMs",
          "embedTimeoutMs",
        ],
        parentPath: ["memory", "qmd"],
        parentSchema: params.qmdSchema,
        parentValue: params.qmdValue,
        props: params.props,
        unsupported: params.unsupported,
      }),
    })}
    ${renderFieldGroupFromFields({
      title: t("configPage.memory.qmdScopeTitle"),
      hint: t("configPage.memory.qmdScopeHint"),
      fields: [
        renderField({
          fieldKey: "scope",
          parentPath: ["memory", "qmd"],
          parentSchema: params.qmdSchema,
          parentValue: params.qmdValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      ],
    })}
    <details class="config-memory-advanced">
      <summary class="config-memory-advanced__summary">${t("configPage.memory.qmdMcporterTitle")}</summary>
      <p class="config-memory-advanced__hint">${t("configPage.memory.qmdMcporterHint")}</p>
      ${renderFieldGroupFromFields({
        title: "",
        fields: renderNestedFields({
          objectKey: "mcporter",
          propertyKeys: ["enabled", "serverName", "startDaemon"],
          parentPath: ["memory", "qmd"],
          parentSchema: params.qmdSchema,
          parentValue: params.qmdValue,
          props: params.props,
          unsupported: params.unsupported,
        }),
      })}
    </details>
  `;
}

export function renderMemoryConfigSection(props: MemoryConfigSectionProps): TemplateResult {
  const memorySchema = memorySchemaNode(props.schema);
  if (!memorySchema || schemaType(memorySchema) !== "object") {
    return html`<div class="muted">${t("configPage.form.schemaUnavailable")}</div>`;
  }

  const memoryValue = asRecord(props.value?.memory);
  const backend = resolveMemoryBackend(memoryValue);
  const qmdSchema = qmdSchemaNode(memorySchema);
  const qmdValue = asRecord(memoryValue.qmd);
  const unsupported = new Set(props.unsupportedPaths ?? []);
  const disabled = props.disabled ?? false;

  return html`
    <div class="config-memory">
      ${renderBackendPicker({ backend, disabled, onPatch: props.onPatch })}
      ${backend === "builtin"
        ? renderBuiltinPanel({ props, memorySchema, memoryValue, unsupported })
        : qmdSchema
          ? renderQmdPanel({
              props,
              memorySchema,
              memoryValue,
              qmdSchema,
              qmdValue,
              unsupported,
            })
          : html`<div class="callout danger">${t("configPage.form.unsupportedSchema")}</div>`}
    </div>
  `;
}
