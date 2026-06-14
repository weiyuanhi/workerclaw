// ACP binding cwd override — shows inherited agent workspace when unset.
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { resolveConfigAgents } from "./nodes-shared.ts";

export type AcpWorkspaceSectionProps = {
  value: Record<string, unknown> | null;
  defaultAgentId?: string | null;
  disabled?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onSectionChange?: (section: string | null) => void;
};

export type AcpWorkspaceTarget = {
  agentId: string;
  listIndex: number;
  agentWorkspace: string;
  workspaceSource: "agent" | "defaults" | "none";
  acpCwd: string;
};

type AcpRecord = Record<string, unknown>;

function asRecord(value: unknown): AcpRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AcpRecord) : {};
}

export function resolveAcpConfigDefaultAgentId(config: Record<string, unknown> | null): string {
  const agents = resolveConfigAgents(config);
  const flagged = agents.find((entry) => entry.isDefault);
  return flagged?.id ?? agents[0]?.id ?? "main";
}

export function resolveAcpWorkspaceTarget(
  config: Record<string, unknown> | null,
  defaultAgentId?: string | null,
): AcpWorkspaceTarget {
  const agentId = defaultAgentId?.trim() || resolveAcpConfigDefaultAgentId(config);
  const agents = resolveConfigAgents(config);
  const match = agents.find((entry) => entry.id === agentId);
  const defaults = asRecord(asRecord(config?.agents).defaults);
  const agentWorkspace =
    typeof match?.record.workspace === "string" ? match.record.workspace.trim() : "";
  const defaultsWorkspace =
    typeof defaults.workspace === "string" ? defaults.workspace.trim() : "";
  const runtime = asRecord(match?.record.runtime);
  const acp = asRecord(runtime.acp);
  const acpCwd = typeof acp.cwd === "string" ? acp.cwd.trim() : "";
  const workspaceSource: AcpWorkspaceTarget["workspaceSource"] = agentWorkspace
    ? "agent"
    : defaultsWorkspace
      ? "defaults"
      : "none";
  const inheritedWorkspace = agentWorkspace || defaultsWorkspace;

  return {
    agentId,
    listIndex: match?.index ?? -1,
    agentWorkspace: inheritedWorkspace,
    workspaceSource,
    acpCwd,
  };
}

export function resolveEffectiveAcpRuntimeCwd(target: AcpWorkspaceTarget): string {
  return target.acpCwd || target.agentWorkspace;
}

function planAgentListIndex(config: Record<string, unknown> | null, agentId: string): number {
  const agents = resolveConfigAgents(config);
  const match = agents.find((entry) => entry.id === agentId);
  return match?.index ?? agents.length;
}

export function patchDefaultAgentAcpCwd(
  props: Pick<AcpWorkspaceSectionProps, "value" | "onPatch">,
  target: AcpWorkspaceTarget,
  nextValue: string,
): void {
  const normalized = nextValue.trim();
  const value = normalized || undefined;
  const listIndex =
    target.listIndex >= 0 ? target.listIndex : planAgentListIndex(props.value, target.agentId);
  if (target.listIndex < 0) {
    props.onPatch(["agents", "list", listIndex, "id"], target.agentId);
  }
  if (value) {
    props.onPatch(["agents", "list", listIndex, "runtime", "type"], "acp");
  }
  props.onPatch(["agents", "list", listIndex, "runtime", "acp", "cwd"], value);
}

function renderEffectiveCwdNote(target: AcpWorkspaceTarget): TemplateResult | typeof nothing {
  const effective = resolveEffectiveAcpRuntimeCwd(target);
  if (target.acpCwd) {
    return html`
      <p class="config-acp-picker__meta muted">
        ${t("configPage.acp.acpCwdEffectiveConfigured", { path: effective })}
      </p>
    `;
  }
  if (target.agentWorkspace) {
    return html`
      <p class="config-acp-picker__meta muted">
        ${t("configPage.acp.acpCwdEffectiveInherited", { path: effective })}
      </p>
    `;
  }
  return html`
    <p class="config-acp-picker__meta muted">${t("configPage.acp.acpCwdEffectiveMissing")}</p>
  `;
}

export function renderAcpWorkspaceSection(props: AcpWorkspaceSectionProps): TemplateResult {
  const target = resolveAcpWorkspaceTarget(props.value, props.defaultAgentId);
  const inheritedPlaceholder = target.agentWorkspace || t("configPage.acp.acpCwdPlaceholderEmpty");

  return html`
    <section class="config-memory-group">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">${t("configPage.acp.workspaceTitle")}</h4>
        <p class="config-memory-group__hint">${t("configPage.acp.workspaceHint")}</p>
        <p class="config-acp-picker__meta muted">
          ${t("configPage.acp.workspaceAgentLabel", { agentId: target.agentId })}
        </p>
      </div>
      ${renderEffectiveCwdNote(target)}
      <label class="config-acp-custom-field">
        <span class="config-acp-custom-field__label">${t("configPage.acp.acpCwdLabel")}</span>
        <input
          class="cfg-input"
          type="text"
          .value=${target.acpCwd}
          ?disabled=${props.disabled}
          placeholder=${inheritedPlaceholder}
          @input=${(event: Event) => {
            const value = (event.target as HTMLInputElement).value;
            patchDefaultAgentAcpCwd(props, target, value);
          }}
        />
      </label>
      <p class="config-acp-picker__meta muted">${t("configPage.acp.acpCwdOverrideHint")}</p>
      ${props.onSectionChange && !target.agentWorkspace
        ? html`
            <button
              type="button"
              class="btn btn--sm config-acp-workspace__agents-link"
              ?disabled=${props.disabled}
              @click=${() => props.onSectionChange?.("agents")}
            >
              ${t("configPage.acp.goToAgents")}
            </button>
          `
        : nothing}
    </section>
  `;
}
