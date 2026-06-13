/**
 * Quick Settings view — opinionated card layout for the most common settings.
 * Replaces the raw schema-driven form as the default settings experience.
 *
 * Each card answers a "what do I want to do?" question with status + actions.
 */

import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { BorderRadiusStop, TextScaleStop } from "../storage.ts";
import { normalizeOptionalString } from "../string-coerce.ts";
import type { ThemeTransitionContext } from "../theme-transition.ts";
import type { ThemeMode, ThemeName } from "../theme.ts";
import {
  normalizeLocalUserIdentity,
  resolveLocalUserAvatarText,
  resolveLocalUserAvatarUrl,
} from "../user-identity.ts";
import {
  assistantAvatarFallbackUrl,
  resolveChatAvatarRenderUrl,
  resolveAssistantTextAvatar,
} from "./agents-utils.ts";
import {
  CONFIG_PRESETS,
  detectActivePreset,
  getPresetById,
  type ConfigPresetId,
} from "./config-presets.ts";

// ── Types ──

export type QuickSettingsChannel = {
  id: string;
  label: string;
  connected: boolean;
  detail?: string;
};

export type QuickSettingsAutomation = {
  cronJobCount: number;
  skillCount: number;
  mcpServerCount: number;
};

export type QuickSettingsSecurity = {
  gatewayAuth: string;
  execPolicy: string;
  deviceAuth: boolean;
  browserEnabled: boolean;
  toolProfile: string;
};

export type QuickSettingsProps = {
  // Model & Thinking
  currentModel: string;
  thinkingLevel: string;
  fastMode: boolean;
  onModelChange?: () => void;
  onThinkingChange?: (level: string) => void;
  onFastModeToggle?: () => void;

  // Channels
  channels: QuickSettingsChannel[];
  onChannelConfigure?: (channelId: string) => void;

  // Automations
  automation: QuickSettingsAutomation;
  onManageCron?: () => void;
  onBrowseSkills?: () => void;
  onConfigureMcp?: () => void;

  // Security
  security: QuickSettingsSecurity;
  onSecurityConfigure?: () => void;
  onBrowserEnabledToggle?: (enabled: boolean) => void;
  onToolProfileChange?: (profile: string) => void;

  // Appearance
  theme: ThemeName;
  themeMode: ThemeMode;
  hasCustomTheme: boolean;
  customThemeLabel?: string | null;
  borderRadius: number;
  textScale: number;
  setTheme: (theme: ThemeName, context?: ThemeTransitionContext) => void;
  onOpenCustomThemeImport?: () => void;
  setThemeMode: (mode: ThemeMode, context?: ThemeTransitionContext) => void;
  setBorderRadius: (value: number) => void;
  setTextScale: (value: number) => void;
  userAvatar?: string | null;
  onUserAvatarChange?: (next: string | null) => void;

  // Presets
  configObject?: Record<string, unknown>;
  savedConfigObject?: Record<string, unknown>;
  configDirty?: boolean;
  configSaving?: boolean;
  configApplying?: boolean;
  configReady?: boolean;
  onSelectPreset?: (presetId: ConfigPresetId) => void;
  onResetConfig?: () => void;
  onSaveConfig?: () => void;
  onApplyConfig?: () => void;

  // Navigation
  onAdvancedSettings?: () => void;

  // Connection
  connected: boolean;
  gatewayUrl: string;
  assistantName: string;
  assistantAvatar?: string | null;
  assistantAvatarUrl?: string | null;
  assistantAvatarSource?: string | null;
  assistantAvatarStatus?: "none" | "local" | "remote" | "data" | null;
  assistantAvatarReason?: string | null;
  assistantAvatarOverride?: string | null;
  assistantAvatarUploadBusy?: boolean;
  assistantAvatarUploadError?: string | null;
  onAssistantAvatarOverrideChange?: (dataUrl: string) => void | Promise<void>;
  onAssistantAvatarClearOverride?: () => void | Promise<void>;
  basePath?: string | null;
  version: string;
};

// ── Theme options ──

type ThemeOption = { id: ThemeName; label: string };
const BUILTIN_THEME_OPTIONS: ThemeOption[] = [
  { id: "claw", label: "Claw" },
  { id: "knot", label: "Knot" },
  { id: "dash", label: "Dash" },
];

const BORDER_RADIUS_STOPS: BorderRadiusStop[] = [0, 25, 50, 75, 100];
const TEXT_SCALE_OPTIONS: TextScaleStop[] = [90, 100, 110, 125, 140];

const THINKING_LEVELS = ["off", "low", "medium", "high"];
const TOOL_PROFILES = ["minimal", "coding", "messaging", "full"];
// Keep raw uploads comfortably below the 2 MB persisted data URL limit after
// base64 expansion and a small MIME/header prefix are added.
const MAX_LOCAL_USER_AVATAR_FILE_BYTES = 1_500_000;
const MAX_ASSISTANT_AVATAR_UPLOAD_BYTES = MAX_LOCAL_USER_AVATAR_FILE_BYTES;

function localUserLabel(): string {
  return t("configQuick.personal.you");
}

function localizedQuickBorderRadiusLabel(stop: BorderRadiusStop): string {
  switch (stop) {
    case 0:
      return t("configPage.appearance.roundnessNone");
    case 25:
      return t("configPage.appearance.roundnessSlight");
    case 50:
      return t("configPage.appearance.roundnessDefault");
    case 75:
      return t("configPage.appearance.roundnessRound");
    case 100:
      return t("configPage.appearance.roundnessFull");
  }
}

function localizedQuickTextScaleLabel(stop: TextScaleStop): string {
  switch (stop) {
    case 90:
      return t("configPage.appearance.textSmall");
    case 100:
      return t("configPage.appearance.textDefault");
    case 110:
      return t("configPage.appearance.textLarge");
    case 125:
      return t("configPage.appearance.textXl");
    case 140:
      return t("configPage.appearance.textXxl");
  }
}

function localizedToolProfileLabel(profile: string): string {
  const key = `agents.toolsPanel.profiles.${profile}`;
  const label = t(key);
  return label !== key ? label : profile;
}

function renderDefaultUserAvatar() {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  `;
}

function renderLocalUserAvatarPreview(avatar: string | null | undefined) {
  const identity = normalizeLocalUserIdentity({ name: null, avatar });
  const avatarUrl = resolveLocalUserAvatarUrl(identity);
  const avatarText = resolveLocalUserAvatarText(identity);
  if (avatarUrl) {
    return html`<img class="qs-user-avatar" src=${avatarUrl} alt=${localUserLabel()} />`;
  }
  if (avatarText) {
    return html`<div class="qs-user-avatar qs-user-avatar--text" aria-label=${localUserLabel()}>
      ${avatarText}
    </div>`;
  }
  return html`
    <div class="qs-user-avatar qs-user-avatar--default" aria-label=${localUserLabel()}>
      ${renderDefaultUserAvatar()}
    </div>
  `;
}

function resolveAssistantPreviewAvatarUrl(props: QuickSettingsProps): string | null {
  const override = normalizeOptionalString(props.assistantAvatarOverride);
  if (override) {
    return resolveChatAvatarRenderUrl(override, {
      identity: {
        avatar: override,
        avatarUrl: override,
      },
    });
  }
  if (props.assistantAvatarStatus === "none" && props.assistantAvatarReason === "missing") {
    return null;
  }
  return resolveChatAvatarRenderUrl(props.assistantAvatarUrl, {
    identity: {
      avatar: props.assistantAvatar ?? undefined,
      avatarUrl: props.assistantAvatarUrl ?? undefined,
    },
  });
}

function formatAssistantAvatarSource(value: string | null | undefined): string | null {
  const source = normalizeOptionalString(value);
  if (!source) {
    return null;
  }
  if (/^data:image\//i.test(source)) {
    const header = source.slice(0, source.indexOf(",") > 0 ? source.indexOf(",") : 32);
    return `${header},...`;
  }
  return source.length > 72 ? `${source.slice(0, 34)}...${source.slice(-24)}` : source;
}

function formatAssistantAvatarIssue(
  status: QuickSettingsProps["assistantAvatarStatus"],
  reason: string | null | undefined,
  _rendered: boolean,
  hasOverride = false,
): string | null {
  if (hasOverride) {
    return null;
  }
  if (status === "remote") {
    return t("configQuick.avatarErrors.remoteBlocked");
  }
  if (reason === "missing") {
    return t("configQuick.avatarErrors.fileNotFound");
  }
  if (reason === "unsupported_extension") {
    return t("configQuick.avatarErrors.unsupportedType");
  }
  if (reason === "outside_workspace") {
    return t("configQuick.avatarErrors.outsideWorkspace");
  }
  if (reason === "too_large") {
    return t("configQuick.avatarErrors.tooLarge");
  }
  return reason ? t("configQuick.avatarErrors.cannotRender") : null;
}

function renderAssistantAvatarPreview(props: QuickSettingsProps) {
  const assistantName = normalizeOptionalString(props.assistantName) ?? t("configQuick.personal.assistant");
  const assistantAvatarOverride = normalizeOptionalString(props.assistantAvatarOverride);
  const assistantAvatarUrl = resolveAssistantPreviewAvatarUrl(props);
  if (assistantAvatarUrl) {
    return html`<img class="qs-assistant-avatar" src=${assistantAvatarUrl} alt=${assistantName} />`;
  }
  const assistantAvatarText = resolveAssistantTextAvatar(
    assistantAvatarOverride ?? props.assistantAvatar,
  );
  if (assistantAvatarText) {
    return html`<div
      class="qs-assistant-avatar qs-assistant-avatar--text"
      aria-label=${assistantName}
    >
      ${assistantAvatarText}
    </div>`;
  }
  return html`
    <img
      class="qs-assistant-avatar qs-assistant-avatar--fallback"
      src=${assistantAvatarFallbackUrl(props.basePath ?? "")}
      alt=${assistantName}
    />
  `;
}

function handleLocalUserAvatarFileSelect(e: Event, props: QuickSettingsProps) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  const onUserAvatarChange = props.onUserAvatarChange;
  if (!file || !onUserAvatarChange) {
    input.value = "";
    return;
  }
  if (!file.type.startsWith("image/")) {
    input.value = "";
    return;
  }
  if (file.size > MAX_LOCAL_USER_AVATAR_FILE_BYTES) {
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    onUserAvatarChange(typeof reader.result === "string" ? reader.result : null);
  });
  reader.readAsDataURL(file);
  input.value = "";
}

function handleAssistantAvatarFileSelect(e: Event, props: QuickSettingsProps) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  const onAssistantAvatarOverrideChange = props.onAssistantAvatarOverrideChange;
  if (!file || !onAssistantAvatarOverrideChange) {
    input.value = "";
    return;
  }
  if (file.size > MAX_ASSISTANT_AVATAR_UPLOAD_BYTES) {
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    if (result) {
      void onAssistantAvatarOverrideChange(result);
    }
  });
  reader.readAsDataURL(file);
  input.value = "";
}

type ProfileSettings = {
  bootstrapMaxChars: number;
  bootstrapTotalMaxChars: number;
  contextInjection: "always" | "continuation-skip";
};

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  bootstrapMaxChars: 20_000,
  bootstrapTotalMaxChars: 60_000,
  contextInjection: "always",
};

function resolveProfileSettings(config?: Record<string, unknown>): ProfileSettings {
  const agents = config?.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const bootstrapMaxChars =
    typeof defaults?.bootstrapMaxChars === "number" && Number.isFinite(defaults.bootstrapMaxChars)
      ? Math.floor(defaults.bootstrapMaxChars)
      : DEFAULT_PROFILE_SETTINGS.bootstrapMaxChars;
  const bootstrapTotalMaxChars =
    typeof defaults?.bootstrapTotalMaxChars === "number" &&
    Number.isFinite(defaults.bootstrapTotalMaxChars)
      ? Math.floor(defaults.bootstrapTotalMaxChars)
      : DEFAULT_PROFILE_SETTINGS.bootstrapTotalMaxChars;
  const contextInjection =
    defaults?.contextInjection === "continuation-skip" ? "continuation-skip" : "always";
  return { bootstrapMaxChars, bootstrapTotalMaxChars, contextInjection };
}

function profileSettingsEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return (
    a.bootstrapMaxChars === b.bootstrapMaxChars &&
    a.bootstrapTotalMaxChars === b.bootstrapTotalMaxChars &&
    a.contextInjection === b.contextInjection
  );
}

function formatCharBudget(value: number): string {
  return `${value.toLocaleString()} chars`;
}

function formatContextInjectionLabel(mode: ProfileSettings["contextInjection"]): string {
  return mode === "always"
    ? t("configQuick.profile.everyTurn")
    : t("configQuick.profile.skipSafeFollowUps");
}

function describeContextInjection(mode: ProfileSettings["contextInjection"]): string {
  return mode === "always"
    ? t("configQuick.profile.reinjectEveryTurn")
    : t("configQuick.profile.skipReinject");
}

function renderProfileStat(params: {
  label: string;
  value: string;
  previousValue: string;
  note: string;
}) {
  const changed = params.value !== params.previousValue;
  return html`
    <div class="qs-profile-stat ${changed ? "qs-profile-stat--changed" : ""}">
      <div class="qs-profile-stat__header">
        <span class="qs-profile-stat__label">${params.label}</span>
        <span class="qs-profile-stat__value">${params.value}</span>
      </div>
      <div class="qs-profile-stat__sub">
        ${changed
          ? t("configQuick.profile.wasPrevious", { value: params.previousValue })
          : t("configQuick.profile.matchesDefault")}
      </div>
      <div class="qs-profile-stat__note muted">${params.note}</div>
    </div>
  `;
}

// ── Card renderers ──

function renderCardHeader(icon: TemplateResult, title: string, action?: TemplateResult) {
  return html`
    <div class="qs-card__header">
      <div class="qs-card__header-left">
        <span class="qs-card__icon">${icon}</span>
        <h3 class="qs-card__title">${title}</h3>
      </div>
      ${action ? action : nothing}
    </div>
  `;
}

function renderModelCard(props: QuickSettingsProps) {
  return html`
    <div class="qs-card qs-card--model">
      ${renderCardHeader(icons.brain, t("configQuick.cards.modelThinking"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.model")}</span>
          <button class="qs-row__value qs-row__value--action" @click=${props.onModelChange}>
            <code>${props.currentModel || "default"}</code>
            <span class="qs-row__chevron">${icons.chevronRight}</span>
          </button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.thinking")}</span>
          <div class="qs-segmented">
            ${THINKING_LEVELS.map(
              (level) => html`
                <button
                  class="qs-segmented__btn ${level === props.thinkingLevel
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.onThinkingChange?.(level)}
                >
                  ${level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.fastMode")}</span>
          <label class="qs-toggle">
            <input type="checkbox" .checked=${props.fastMode} @change=${props.onFastModeToggle} />
            <span class="qs-toggle__track"></span>
            <span class="qs-toggle__hint muted"
              >${props.fastMode ? t("configQuick.rows.fastModeOn") : t("configQuick.rows.fastModeOff")}</span
            >
          </label>
        </div>
      </div>
    </div>
  `;
}

function renderChannelsCard(props: QuickSettingsProps) {
  const connectedCount = props.channels.filter((c) => c.connected).length;
  const badge =
    connectedCount > 0
      ? html`<span class="qs-badge qs-badge--ok">${t("configQuick.channels.connectedCount", { count: String(connectedCount) })}</span>`
      : undefined;

  return html`
    <div class="qs-card qs-card--channels">
      ${renderCardHeader(icons.send, t("configQuick.cards.channels"), badge)}
      <div class="qs-card__body">
        ${props.channels.length === 0
          ? html`<div class="qs-empty muted">${t("configQuick.channels.noChannels")}</div>`
          : props.channels.map(
              (ch) => html`
                <div class="qs-row">
                  <span class="qs-row__label">
                    <span class="qs-status-dot ${ch.connected ? "qs-status-dot--ok" : ""}"></span>
                    ${ch.label}
                  </span>
                  <span class="qs-row__value">
                    ${ch.connected
                      ? html`<span class="muted">${ch.detail ?? t("configQuick.channels.connected")}</span>`
                      : html`<button
                          class="qs-link-btn"
                          @click=${() => props.onChannelConfigure?.(ch.id)}
                        >
                          ${t("configQuick.channels.connect")}
                        </button>`}
                  </span>
                </div>
              `,
            )}
      </div>
    </div>
  `;
}

function renderAutomationsCard(props: QuickSettingsProps) {
  const { cronJobCount, skillCount, mcpServerCount } = props.automation;

  return html`
    <div class="qs-card qs-card--automations">
      ${renderCardHeader(icons.zap, t("configQuick.cards.automations"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">
            ${cronJobCount === 1
              ? t("configQuick.automations.scheduledTasks", { count: String(cronJobCount) })
              : t("configQuick.automations.scheduledTasksMany", { count: String(cronJobCount) })}
          </span>
          <button class="qs-link-btn" @click=${props.onManageCron}>${t("configQuick.automations.manage")}</button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">
            ${skillCount === 1
              ? t("configQuick.automations.skillsInstalled", { count: String(skillCount) })
              : t("configQuick.automations.skillsInstalledMany", { count: String(skillCount) })}
          </span>
          <button class="qs-link-btn" @click=${props.onBrowseSkills}>${t("configQuick.automations.browse")}</button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">
            ${mcpServerCount === 1
              ? t("configQuick.automations.mcpServers", { count: String(mcpServerCount) })
              : t("configQuick.automations.mcpServersMany", { count: String(mcpServerCount) })}
          </span>
          <button class="qs-link-btn" @click=${props.onConfigureMcp}>${t("configQuick.automations.configure")}</button>
        </div>
      </div>
    </div>
  `;
}

function renderSecurityCard(props: QuickSettingsProps) {
  const { gatewayAuth, execPolicy, deviceAuth, browserEnabled, toolProfile } = props.security;
  const normalizedToolProfile = toolProfile.trim() || "full";
  const toolProfiles = TOOL_PROFILES.includes(normalizedToolProfile)
    ? TOOL_PROFILES
    : [...TOOL_PROFILES, normalizedToolProfile];

  return html`
    <div class="qs-card qs-card--security">
      ${renderCardHeader(
        icons.eye,
        t("configQuick.cards.security"),
        html`<button class="qs-link-btn" @click=${props.onSecurityConfigure}>${t("configQuick.automations.configure")}</button>`,
      )}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.gatewayAuth")}</span>
          <span class="qs-row__value">
            <span class="qs-badge ${gatewayAuth !== "none" ? "qs-badge--ok" : "qs-badge--warn"}"
              >${gatewayAuth}</span
            >
          </span>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.execPolicy")}</span>
          <span class="qs-row__value"><span class="qs-badge">${execPolicy}</span></span>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("quickSettings.security.browserEnabled")}</span>
          <label class="qs-toggle">
            <input
              type="checkbox"
              .checked=${browserEnabled}
              @change=${(event: Event) =>
                props.onBrowserEnabledToggle?.((event.currentTarget as HTMLInputElement).checked)}
            />
            <span class="qs-toggle__track"></span>
            <span class="qs-toggle__hint muted">${browserEnabled ? t("configQuick.rows.enabled") : t("configQuick.rows.disabled")}</span>
          </label>
        </div>
        <div class="qs-row qs-row--tool-profile">
          <span class="qs-row__label">${t("quickSettings.security.toolProfile")}</span>
          <div class="qs-segmented">
            ${toolProfiles.map(
              (profile) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${profile ===
                  normalizedToolProfile
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.onToolProfileChange?.(profile)}
                >
                  ${localizedToolProfileLabel(profile)}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.deviceAuth")}</span>
          <span class="qs-row__value">
            <span class="qs-badge ${deviceAuth ? "qs-badge--ok" : "qs-badge--warn"}"
              >${deviceAuth ? t("configQuick.rows.enabled") : t("configQuick.rows.disabled")}</span
            >
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderAppearanceCard(props: QuickSettingsProps) {
  const importedThemeName = props.hasCustomTheme
    ? (props.customThemeLabel ?? t("configQuick.personal.importedTheme"))
    : t("configQuick.personal.import");
  const themeOptions: ThemeOption[] = [
    ...BUILTIN_THEME_OPTIONS,
    { id: "custom", label: importedThemeName },
  ];
  return html`
    <div class="qs-card qs-card--appearance">
      ${renderCardHeader(icons.spark, t("configQuick.cards.appearance"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.theme")}</span>
          <div class="qs-segmented">
            ${themeOptions.map(
              (opt) => html`
                <button
                  class="qs-segmented__btn ${opt.id === props.theme
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${(e: Event) => {
                    if (opt.id === "custom" && !props.hasCustomTheme) {
                      props.onOpenCustomThemeImport?.();
                      return;
                    }
                    if (opt.id !== props.theme) {
                      props.setTheme(opt.id, {
                        element: (e.currentTarget as HTMLElement) ?? undefined,
                      });
                    }
                  }}
                >
                  ${opt.label}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.mode")}</span>
          <div class="qs-segmented">
            ${(["light", "dark", "system"] as ThemeMode[]).map(
              (mode) => html`
                <button
                  class="qs-segmented__btn ${mode === props.themeMode
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${(e: Event) => {
                    if (mode !== props.themeMode) {
                      props.setThemeMode(mode, {
                        element: (e.currentTarget as HTMLElement) ?? undefined,
                      });
                    }
                  }}
                >
                  ${mode === "light"
                    ? t("common.light")
                    : mode === "dark"
                      ? t("common.dark")
                      : t("common.system")}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.roundness")}</span>
          <div class="qs-segmented">
            ${BORDER_RADIUS_STOPS.map(
              (value) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${value ===
                  props.borderRadius
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.setBorderRadius(value)}
                >
                  ${localizedQuickBorderRadiusLabel(value)}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("configQuick.rows.textSize")}</span>
          <div class="qs-segmented">
            ${TEXT_SCALE_OPTIONS.map(
              (value) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${value ===
                  props.textScale
                    ? "qs-segmented__btn--active"
                    : ""}"
                  title=${`${value}%`}
                  @click=${() => props.setTextScale(value)}
                >
                  ${localizedQuickTextScaleLabel(value)}
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPersonalCard(props: QuickSettingsProps) {
  const identity = normalizeLocalUserIdentity({
    name: null,
    avatar: props.userAvatar ?? null,
  });
  const avatarText = resolveLocalUserAvatarText(identity) ?? "";
  const assistantName = normalizeOptionalString(props.assistantName) ?? t("configQuick.personal.assistant");
  const assistantAvatarUrl = resolveAssistantPreviewAvatarUrl(props);
  const assistantAvatarRendered = Boolean(
    assistantAvatarUrl ||
    resolveAssistantTextAvatar(props.assistantAvatarOverride ?? props.assistantAvatar),
  );
  const assistantAvatarOverride = normalizeOptionalString(props.assistantAvatarOverride);
  const assistantAvatarSource = formatAssistantAvatarSource(
    assistantAvatarOverride ?? props.assistantAvatarSource,
  );
  const assistantAvatarIssue = formatAssistantAvatarIssue(
    props.assistantAvatarStatus ?? null,
    props.assistantAvatarReason,
    assistantAvatarRendered,
    Boolean(assistantAvatarOverride),
  );
  const assistantAvatarSourceLabel = assistantAvatarOverride
    ? t("configQuick.personal.uiOverride")
    : t("configQuick.personal.identityMd");
  const canOverrideAssistantAvatar = Boolean(props.onAssistantAvatarOverrideChange);
  const assistantAvatarSubtitle = assistantAvatarOverride
    ? t("configQuick.personal.overrideFromSettings")
    : assistantAvatarIssue
      ? t("configQuick.personal.fallbackAvatar")
      : assistantAvatarRendered
        ? t("configQuick.personal.fromIdentity")
        : t("configQuick.personal.fallbackLogo");
  return html`
    <div class="qs-card qs-card--personal">
      ${renderCardHeader(icons.image, t("configQuick.cards.personal"))}
      <div class="qs-card__body">
        <div class="qs-identity-grid">
          <section class="qs-identity-card" aria-label=${t("configQuick.personal.userIdentityAria")}>
            ${renderLocalUserAvatarPreview(props.userAvatar)}
            <div class="qs-identity-card__copy">
              <div class="qs-identity-card__eyebrow">${t("configQuick.personal.user")}</div>
              <div class="qs-identity-card__title">${localUserLabel()}</div>
              <div class="qs-identity-card__sub">${t("configQuick.personal.avatarBrowserLocal")}</div>
              <div class="qs-identity-card__repair">
                <label class="qs-field">
                  <span class="qs-row__label">${t("configQuick.personal.avatarTextEmoji")}</span>
                  <input
                    class="qs-field__input"
                    type="text"
                    maxlength="16"
                    .value=${avatarText}
                    placeholder=${t("configQuick.personal.avatarPlaceholder")}
                    @input=${(e: Event) => {
                      const value = (e.target as HTMLInputElement).value;
                      props.onUserAvatarChange?.(value.trim() ? value : null);
                    }}
                  />
                </label>
                <div class="qs-identity-card__actions">
                  <label class="btn btn--sm">
                    ${t("configQuick.personal.chooseImage")}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      @change=${(e: Event) => handleLocalUserAvatarFileSelect(e, props)}
                    />
                  </label>
                  <button
                    type="button"
                    class="btn btn--sm btn--ghost"
                    ?disabled=${!identity.avatar}
                    @click=${() => {
                      props.onUserAvatarChange?.(null);
                    }}
                  >
                    ${t("configQuick.personal.clearAvatar")}
                  </button>
                </div>
                <div class="muted">${t("configQuick.personal.storedBrowserOnly")}</div>
              </div>
            </div>
          </section>
          <section
            class="qs-identity-card qs-identity-card--assistant"
            aria-label=${t("configQuick.personal.assistantIdentityAria")}
          >
            ${renderAssistantAvatarPreview(props)}
            <div class="qs-identity-card__copy">
              <div class="qs-identity-card__eyebrow">${t("configQuick.personal.assistant")}</div>
              <div class="qs-identity-card__title">${assistantName}</div>
              <div class="qs-identity-card__sub">${assistantAvatarSubtitle}</div>
              ${assistantAvatarSource
                ? html`
                    <div
                      class="qs-identity-card__source"
                      title=${props.assistantAvatarSource ?? ""}
                    >
                      <span>${assistantAvatarSourceLabel}</span>
                      <code>${assistantAvatarSource}</code>
                    </div>
                  `
                : nothing}
              ${assistantAvatarIssue
                ? html`<div class="qs-identity-card__issue">${assistantAvatarIssue}</div>`
                : nothing}
              ${canOverrideAssistantAvatar
                ? html`
                    <div class="qs-identity-card__repair">
                      <div class="qs-identity-card__actions">
                        <label class="btn btn--sm">
                          ${props.assistantAvatarUploadBusy
                            ? t("configQuick.personal.saving")
                            : assistantAvatarOverride
                              ? t("configQuick.personal.replaceImage")
                              : t("configQuick.personal.chooseImage")}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            ?disabled=${props.assistantAvatarUploadBusy === true}
                            @change=${(e: Event) => handleAssistantAvatarFileSelect(e, props)}
                          />
                        </label>
                        ${assistantAvatarOverride
                          ? html`
                              <button
                                type="button"
                                class="btn btn--sm btn--ghost"
                                ?disabled=${props.assistantAvatarUploadBusy === true}
                                @click=${() => {
                                  void props.onAssistantAvatarClearOverride?.();
                                }}
                              >
                                ${t("configQuick.personal.clearOverride")}
                              </button>
                            `
                          : nothing}
                      </div>
                      <div class="muted">${t("configQuick.personal.overrideHint")}</div>
                    </div>
                  `
                : nothing}
              ${props.assistantAvatarUploadError
                ? html`<div class="qs-identity-card__error">
                    ${props.assistantAvatarUploadError}
                  </div>`
                : nothing}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderPresetsCard(props: QuickSettingsProps) {
  const draftConfig = props.configObject ?? props.savedConfigObject ?? {};
  const savedConfig = props.savedConfigObject ?? {};
  const selectedPresetId = detectActivePreset(draftConfig);
  const savedPresetId = detectActivePreset(savedConfig);
  const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : undefined;
  const savedPreset = savedPresetId ? getPresetById(savedPresetId) : undefined;
  const draftSettings = resolveProfileSettings(draftConfig);
  const savedSettings = resolveProfileSettings(savedConfig);
  const hasPendingProfileChange = !profileSettingsEqual(draftSettings, savedSettings);
  const hasPendingConfigChange = props.configDirty === true;
  const canCommit =
    props.connected &&
    props.configReady === true &&
    props.configSaving !== true &&
    props.configApplying !== true;
  const stateBanner = hasPendingProfileChange
    ? html`
        <div class="qs-profile-state qs-profile-state--pending" aria-live="polite">
          <span class="qs-status-dot"></span>
          <div class="qs-profile-state__text">
            <span class="qs-profile-state__title"
              >${t("configQuick.profile.customSelectedUnsaved", {
                label: selectedPreset?.label ?? t("configQuick.profile.custom"),
              })}</span
            >
            <span class="qs-profile-state__copy">${t("configQuick.profile.saveProfileCopy")}</span
            >
          </div>
        </div>
      `
    : savedPreset
      ? html`
          <div class="qs-profile-state qs-profile-state--ok" aria-live="polite">
            <span class="qs-status-dot qs-status-dot--ok"></span>
            <div class="qs-profile-state__text">
              <span class="qs-profile-state__title"
                >${t("configQuick.profile.currentDefault", { label: savedPreset.label })}</span
              >
              <span class="qs-profile-state__copy"
                >${t("configQuick.profile.profilesOnlyChange")}</span
              >
            </div>
          </div>
        `
      : html`
          <div class="qs-profile-state" aria-live="polite">
            <span class="qs-status-dot"></span>
            <div class="qs-profile-state__text">
              <span class="qs-profile-state__title">${t("configQuick.profile.customActive")}</span>
              <span class="qs-profile-state__copy"
                >${t("configQuick.profile.chooseBuiltInProfile")}</span
              >
            </div>
          </div>
        `;
  const panelTitle = selectedPreset?.label ?? t("configQuick.profile.customConfiguration");
  const panelDescription =
    selectedPreset?.detail ?? t("configQuick.profile.noMatchingProfile");
  const panelImpact =
    selectedPreset?.impact ?? t("configQuick.profile.pickProfileImpact");
  const commitCopy = hasPendingProfileChange
    ? t("configQuick.profile.saveProfileCopy")
    : t("configQuick.profile.otherPendingEdits");

  return html`
    <div class="qs-card qs-card--span-all">
      ${renderCardHeader(
        icons.zap,
        t("configQuick.cards.contextProfile"),
        hasPendingProfileChange
          ? html`<span class="qs-badge qs-badge--warn">${t("configQuick.profile.pending")}</span>`
          : savedPreset
            ? html`<span class="qs-badge qs-badge--ok">${t("configQuick.profile.saved")}</span>`
            : html`<span class="qs-badge">${t("configQuick.profile.custom")}</span>`,
      )}
      <div class="qs-card__body qs-profiles">
        <div class="qs-profiles__copy">
          <div class="qs-profiles__eyebrow">${t("configQuick.profile.bootstrapContext")}</div>
          <p class="qs-profiles__intro">${t("configQuick.profile.intro")}</p>
          ${stateBanner}
          <div class="qs-presets-grid">
            ${CONFIG_PRESETS.map((preset) => {
              const presetDefaults = ((preset.patch.agents as Record<string, unknown> | undefined)
                ?.defaults ?? {}) as Record<string, unknown>;
              const presetContext =
                presetDefaults.contextInjection === "continuation-skip"
                  ? "continuation-skip"
                  : "always";
              return html`
                <button
                  type="button"
                  class="qs-preset ${preset.id === selectedPresetId ? "qs-preset--active" : ""}"
                  aria-pressed=${preset.id === selectedPresetId}
                  @click=${() => props.onSelectPreset?.(preset.id)}
                >
                  <div class="qs-preset__head">
                    <div class="qs-preset__identity">
                      <span class="qs-preset__icon">${preset.icon}</span>
                      <div class="qs-preset__identity-copy">
                        <span class="qs-preset__label">${preset.label}</span>
                        <span class="qs-preset__desc muted">${preset.description}</span>
                      </div>
                    </div>
                    <div class="qs-preset__badges">
                      ${preset.id === savedPresetId
                        ? html`<span class="qs-badge qs-badge--ok">${t("configQuick.profile.current")}</span>`
                        : nothing}
                      ${hasPendingProfileChange && preset.id === selectedPresetId
                        ? html`<span class="qs-badge qs-badge--warn">${t("configQuick.profile.selected")}</span>`
                        : nothing}
                    </div>
                  </div>
                  <div class="qs-preset__meta">
                    <span
                      >${formatCharBudget(Number(presetDefaults.bootstrapMaxChars ?? 0))}
                      ${t("configQuick.profile.perFile")}</span
                    >
                    <span
                      >${formatCharBudget(Number(presetDefaults.bootstrapTotalMaxChars ?? 0))}
                      ${t("configQuick.profile.total")}</span
                    >
                    <span>${formatContextInjectionLabel(presetContext)}</span>
                  </div>
                </button>
              `;
            })}
          </div>
        </div>

        <div class="qs-profile-panel">
          <div class="qs-profile-panel__eyebrow">
            ${selectedPreset
              ? t("configQuick.profile.selectedProfile")
              : t("configQuick.profile.currentValues")}
          </div>
          <h4 class="qs-profile-panel__title">${panelTitle}</h4>
          <p class="qs-profile-panel__copy">${panelDescription}</p>
          <div class="qs-profile-panel__impact">${panelImpact}</div>

          <div class="qs-profile-panel__stats">
            ${renderProfileStat({
              label: t("configQuick.profile.bootstrapPerFile"),
              value: formatCharBudget(draftSettings.bootstrapMaxChars),
              previousValue: formatCharBudget(savedSettings.bootstrapMaxChars),
              note: t("configQuick.profile.bootstrapPerFileNote"),
            })}
            ${renderProfileStat({
              label: t("configQuick.profile.bootstrapTotal"),
              value: formatCharBudget(draftSettings.bootstrapTotalMaxChars),
              previousValue: formatCharBudget(savedSettings.bootstrapTotalMaxChars),
              note: t("configQuick.profile.bootstrapTotalNote"),
            })}
            ${renderProfileStat({
              label: t("configQuick.profile.followUpTurns"),
              value: formatContextInjectionLabel(draftSettings.contextInjection),
              previousValue: formatContextInjectionLabel(savedSettings.contextInjection),
              note: describeContextInjection(draftSettings.contextInjection),
            })}
          </div>

          ${hasPendingConfigChange
            ? html`
                <div class="qs-profile-panel__actions">
                  <div class="qs-profile-panel__actions-copy muted">${commitCopy}</div>
                  <div class="qs-profile-panel__actions-row">
                    <button
                      class="btn btn--sm"
                      ?disabled=${props.configSaving === true || props.configApplying === true}
                      @click=${props.onResetConfig}
                    >
                      ${t("configQuick.profile.discard")}
                    </button>
                    <button
                      class="btn btn--sm primary"
                      ?disabled=${!canCommit}
                      @click=${props.onSaveConfig}
                    >
                      ${props.configSaving === true
                        ? t("configQuick.profile.saving")
                        : hasPendingProfileChange
                          ? t("configQuick.profile.saveProfile")
                          : t("configQuick.profile.saveChanges")}
                    </button>
                    <button
                      class="btn btn--sm"
                      ?disabled=${!canCommit}
                      @click=${props.onApplyConfig}
                    >
                      ${props.configApplying === true
                        ? t("configQuick.profile.applying")
                        : t("configQuick.profile.applyNow")}
                    </button>
                  </div>
                </div>
              `
            : html`
                <div class="qs-profile-panel__footer muted" aria-live="polite">
                  ${savedPreset
                    ? t("configQuick.profile.savedReady")
                    : t("configQuick.profile.customChooseProfile")}
                </div>
              `}
        </div>
      </div>
    </div>
  `;
}

function renderConnectionFooter(props: QuickSettingsProps) {
  return html`
    <div class="qs-footer">
      <div class="qs-footer__row">
        <span class="qs-status-dot ${props.connected ? "qs-status-dot--ok" : ""}"></span>
        <span class="muted">${props.connected ? t("configQuick.footer.connected") : t("configQuick.footer.offline")}</span>
        ${props.assistantName ? html`<span class="muted">· ${props.assistantName}</span>` : nothing}
        ${props.version ? html`<span class="muted">· v${props.version}</span>` : nothing}
      </div>
    </div>
  `;
}

// ── Main render ──

export function renderQuickSettings(props: QuickSettingsProps) {
  return html`
    <div class="qs-container">
      <div class="qs-header">
        <h2 class="qs-header__title">${icons.settings} ${t("configQuick.header.title")}</h2>
        <button class="btn btn--sm" @click=${props.onAdvancedSettings}>
          ${t("configQuick.header.advanced")} ${icons.chevronRight}
        </button>
      </div>

      <div class="qs-grid">
        ${renderModelCard(props)} ${renderChannelsCard(props)} ${renderSecurityCard(props)}
        ${renderPersonalCard(props)}
        <div class="qs-side-stack">
          ${renderAppearanceCard(props)} ${renderAutomationsCard(props)}
        </div>
        ${renderPresetsCard(props)}
      </div>

      ${renderConnectionFooter(props)}
    </div>
  `;
}
