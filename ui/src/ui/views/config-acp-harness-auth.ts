import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import {
  type AcpHarnessAuthSpec,
  resolveAcpHarnessAuthSpec,
  resolveRelevantAcpHarnessAuthSpecs,
} from "../../../../src/shared/acp-harness-auth-spec.ts";
import type { AcpHarnessAuthEntry, AcpSetupCatalog } from "../../../../src/shared/acp-setup-catalog.ts";

export type AcpHarnessAuthSectionProps = {
  catalog: AcpSetupCatalog;
  catalogLoading?: boolean;
  value: Record<string, unknown> | null;
  disabled?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
  onSectionChange?: (section: string | null) => void;
  loginBusy?: boolean;
  loginMessage?: string | null;
  loginHarnessId?: string | null;
  onLogin?: (harnessId: string) => void | Promise<void>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function resolveHarnessAuthEntry(
  catalog: AcpSetupCatalog,
  harnessId: string,
): AcpHarnessAuthEntry | undefined {
  return catalog.harnessAuth?.find((entry) => entry.harnessId === harnessId);
}

export function shouldShowHarnessAuthSections(params: {
  acpEnabled: boolean;
  defaultAgent?: string;
  allowedAgents?: string[];
}): boolean {
  return resolveRelevantAcpHarnessAuthSpecs(params).length > 0;
}

export function canStartHarnessBrowserLogin(
  spec: AcpHarnessAuthSpec,
  authEntry: AcpHarnessAuthEntry | undefined,
): boolean {
  if (!spec.supportsBrowserLogin) {
    return false;
  }
  if (!authEntry) {
    return true;
  }
  return authEntry.state !== "api_key" && authEntry.state !== "missing_cli";
}

function resolveAuthStatusLabelKey(state: AcpHarnessAuthEntry["state"]): string {
  return `configPage.acp.harnessAuth.status.${state}`;
}

function resolveAuthStatusClass(state: AcpHarnessAuthEntry["state"]): string {
  switch (state) {
    case "logged_in":
    case "api_key":
      return "config-acp-harness-auth__status--ok";
    case "logged_out":
    case "missing_cli":
      return "config-acp-harness-auth__status--warn";
    default:
      return "config-acp-harness-auth__status--error";
  }
}

async function copyText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }
  await navigator.clipboard.writeText(text);
}

function resolveEnvVarValue(value: Record<string, unknown> | null, key: string): string {
  const envVars = asRecord(asRecord(value?.env).vars);
  return typeof envVars[key] === "string" ? envVars[key] : "";
}

function renderHarnessAuthCard(params: {
  spec: AcpHarnessAuthSpec;
  authEntry: AcpHarnessAuthEntry | undefined;
  props: AcpHarnessAuthSectionProps;
}): TemplateResult {
  const { spec, authEntry, props } = params;
  const loginCommand = authEntry?.loginCommand ?? buildFallbackLoginCommand(spec);
  const canLogin = canStartHarnessBrowserLogin(spec, authEntry);
  const isLoginBusy = props.loginBusy && props.loginHarnessId === spec.harnessId;
  const showLoginMessage =
    props.loginMessage && (props.loginHarnessId === spec.harnessId || !props.loginHarnessId);

  return html`
    <section class="config-memory-group config-acp-harness-auth">
      <div class="config-memory-group__header">
        <h4 class="config-memory-group__title">
          ${t("configPage.acp.harnessAuth.harnessTitle", { harnessName: spec.displayName })}
        </h4>
        <p class="config-memory-group__hint">${t("configPage.acp.harnessAuth.harnessHint")}</p>
      </div>

      <div class="config-acp-harness-auth__status-row">
        ${authEntry
          ? html`
              <span class="config-acp-harness-auth__status ${resolveAuthStatusClass(authEntry.state)}">
                ${t(resolveAuthStatusLabelKey(authEntry.state))}
              </span>
              ${authEntry.message
                ? html`<span class="config-acp-harness-auth__message muted">${authEntry.message}</span>`
                : nothing}
              ${authEntry.cliCommand
                ? html`<span class="config-acp-harness-auth__cli muted">${authEntry.cliCommand}</span>`
                : nothing}
            `
          : html`<span class="muted">${t("configPage.acp.harnessAuth.statusUnknown")}</span>`}
        <button
          type="button"
          class="btn btn--sm"
          ?disabled=${props.disabled || props.catalogLoading}
          @click=${() => props.onRequestUpdate?.()}
        >
          ${props.catalogLoading
            ? t("configPage.acp.harnessAuth.refreshing")
            : t("configPage.acp.harnessAuth.refresh")}
        </button>
      </div>

      <div class="config-acp-harness-auth__actions">
        ${spec.supportsBrowserLogin
          ? html`
              <button
                type="button"
                class="btn btn--primary btn--sm"
                ?disabled=${props.disabled || isLoginBusy || !canLogin || !props.onLogin}
                @click=${() => props.onLogin?.(spec.harnessId)}
              >
                ${isLoginBusy
                  ? t("configPage.acp.harnessAuth.loginStarting")
                  : t("configPage.acp.harnessAuth.loginBrowser")}
              </button>
            `
          : nothing}
        <button
          type="button"
          class="btn btn--sm"
          ?disabled=${props.disabled}
          @click=${async () => {
            await copyText(loginCommand);
          }}
        >
          ${t("configPage.acp.harnessAuth.copyLoginCommand")}
        </button>
        ${props.onSectionChange
          ? html`
              <button
                type="button"
                class="btn btn--sm"
                @click=${() => props.onSectionChange?.("env")}
              >
                ${t("configPage.acp.harnessAuth.openEnv")}
              </button>
            `
          : nothing}
      </div>

      ${showLoginMessage
        ? html`<div class="callout info config-acp-harness-auth__message-callout">${props.loginMessage}</div>`
        : nothing}

      ${spec.envVars.length > 0
        ? html`
            <div class="config-acp-harness-auth__env-fields">
              ${spec.envVars.map(
                (envVar) => html`
                  <div class="config-acp-harness-auth__field">
                    <label
                      class="config-acp-harness-auth__label"
                      for=${`harness-env-${spec.harnessId}-${envVar.key}`}
                    >
                      ${envVar.label}
                    </label>
                    <input
                      id=${`harness-env-${spec.harnessId}-${envVar.key}`}
                      class="cfg-input"
                      type="password"
                      autocomplete="off"
                      .value=${resolveEnvVarValue(props.value, envVar.key)}
                      ?disabled=${props.disabled}
                      placeholder=${t("configPage.acp.harnessAuth.apiKeyPlaceholder")}
                      @input=${(event: Event) => {
                        const target = event.target as HTMLInputElement;
                        props.onPatch(["env", "vars", envVar.key], target.value);
                      }}
                    />
                  </div>
                `,
              )}
            </div>
            <p class="config-acp-harness-auth__field-hint muted">
              ${t("configPage.acp.harnessAuth.apiKeyHint")}
            </p>
          `
        : nothing}

      <p class="config-acp-harness-auth__terminal-hint muted">
        ${spec.manualLoginHint ??
        t("configPage.acp.harnessAuth.terminalHint", { command: loginCommand })}
      </p>
    </section>
  `;
}

function buildFallbackLoginCommand(spec: AcpHarnessAuthSpec): string {
  const args = spec.loginArgs?.join(" ") ?? "login";
  return `${spec.cliBinary} ${args}`;
}

export function renderAcpHarnessAuthSection(
  props: AcpHarnessAuthSectionProps,
): TemplateResult | typeof nothing {
  const acpValue = asRecord(props.value?.acp);
  const acpEnabled = acpValue.enabled === true;
  const defaultAgent = typeof acpValue.defaultAgent === "string" ? acpValue.defaultAgent : undefined;
  const allowedAgents = Array.isArray(acpValue.allowedAgents)
    ? acpValue.allowedAgents.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  const specs = resolveRelevantAcpHarnessAuthSpecs({ acpEnabled, defaultAgent, allowedAgents });
  if (specs.length === 0) {
    return nothing;
  }

  return html`
    <div class="config-acp-harness-auth-list">
      ${specs.map((spec) =>
        renderHarnessAuthCard({
          spec,
          authEntry: resolveHarnessAuthEntry(props.catalog, spec.harnessId),
          props,
        }),
      )}
    </div>
  `;
}

/** @deprecated Use resolveHarnessAuthEntry instead. */
export function resolveCursorHarnessAuthEntry(catalog: AcpSetupCatalog): AcpHarnessAuthEntry | undefined {
  return resolveHarnessAuthEntry(catalog, "cursor");
}

/** @deprecated Use shouldShowHarnessAuthSections instead. */
export function shouldShowCursorHarnessAuthSection(params: {
  acpEnabled: boolean;
  defaultAgent?: string;
  allowedAgents?: string[];
}): boolean {
  return shouldShowHarnessAuthSections(params);
}

/** @deprecated Use canStartHarnessBrowserLogin instead. */
export function canStartCursorBrowserLogin(authEntry: AcpHarnessAuthEntry | undefined): boolean {
  const spec = resolveAcpHarnessAuthSpec("cursor");
  return spec ? canStartHarnessBrowserLogin(spec, authEntry) : false;
}
