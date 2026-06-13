// Composer toolbar help panel lists bottom chat controls and what each one does.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";

export type ComposerToolbarHintsContext = {
  canAbort: boolean;
  composerToolbarHelpOpen: boolean;
  connected: boolean;
  hasMessages: boolean;
  hasRealtimeTalk: boolean;
  hasRealtimeTalkOptions: boolean;
  isBusy: boolean;
  onComposerToolbarHelpToggle: () => void;
  showSkill: boolean;
  showPlaybook: boolean;
};

type ComposerToolbarHintItem = {
  icon: typeof icons.paperclip;
  label: string;
  description: string;
};

function buildComposerToolbarHintItems(
  ctx: ComposerToolbarHintsContext,
): ComposerToolbarHintItem[] {
  const items: ComposerToolbarHintItem[] = [
    {
      icon: icons.paperclip,
      label: t("chat.composer.toolbarHints.attachFile"),
      description: t("chat.composer.toolbarHints.attachFileHint"),
    },
  ];

  if (ctx.hasRealtimeTalk) {
    items.push({
      icon: icons.radio,
      label: t("chat.composer.toolbarHints.talk"),
      description: t("chat.composer.toolbarHints.talkHint"),
    });
  }

  if (ctx.hasRealtimeTalkOptions) {
    items.push({
      icon: icons.settings,
      label: t("chat.composer.toolbarHints.talkSettings"),
      description: t("chat.composer.toolbarHints.talkSettingsHint"),
    });
  }

  if (ctx.showSkill) {
    items.push({
      icon: icons.puzzle,
      label: t("chat.composer.toolbarHints.skill"),
      description: t("chat.composer.toolbarHints.skillHint"),
    });
  }

  if (ctx.showPlaybook) {
    items.push({
      icon: icons.book,
      label: t("chat.composer.toolbarHints.playbook"),
      description: t("chat.composer.toolbarHints.playbookHint"),
    });
  }

  items.push(
    {
      icon: icons.settings,
      label: t("chat.composer.toolbarHints.settings"),
      description: t("chat.composer.toolbarHints.settingsHint"),
    },
    {
      icon: icons.brain,
      label: t("chat.composer.toolbarHints.model"),
      description: t("chat.composer.toolbarHints.modelHint"),
    },
  );

  if (ctx.canAbort) {
    items.push(
      {
        icon: icons.send,
        label: t("chat.composer.toolbarHints.queue"),
        description: t("chat.composer.toolbarHints.queueHint"),
      },
      {
        icon: icons.stop,
        label: t("chat.composer.toolbarHints.stop"),
        description: t("chat.composer.toolbarHints.stopHint"),
      },
    );
  } else {
    items.push({
      icon: icons.send,
      label: ctx.isBusy
        ? t("chat.composer.toolbarHints.queue")
        : t("chat.composer.toolbarHints.send"),
      description: ctx.isBusy
        ? t("chat.composer.toolbarHints.queueHint")
        : t("chat.composer.toolbarHints.sendHint"),
    });
  }

  return items;
}

export function renderComposerToolbarHelp(ctx: ComposerToolbarHintsContext) {
  const helpTitle = t("chat.composer.toolbarHints.helpTitle");
  const helpButtonLabel = t("chat.composer.toolbarHints.helpButton");
  const items = buildComposerToolbarHintItems(ctx);

  return html`
    <div class="agent-chat__toolbar-help">
      <button
        type="button"
        class="agent-chat__input-btn agent-chat__input-btn--help ${ctx.composerToolbarHelpOpen
          ? "agent-chat__input-btn--active"
          : ""}"
        title=${helpButtonLabel}
        aria-label=${helpButtonLabel}
        aria-expanded=${ctx.composerToolbarHelpOpen ? "true" : "false"}
        aria-controls="agent-chat-composer-toolbar-help-panel"
        data-tooltip=${helpButtonLabel}
        @click=${(event: Event) => {
          event.stopPropagation();
          ctx.onComposerToolbarHelpToggle();
        }}
      >
        ${icons.circleHelp}
        <span class="agent-chat__control-label">${helpButtonLabel}</span>
      </button>
      ${ctx.composerToolbarHelpOpen
        ? html`
            <div
              id="agent-chat-composer-toolbar-help-panel"
              class="agent-chat__toolbar-help-panel"
              role="dialog"
              aria-label=${helpTitle}
              @click=${(event: Event) => event.stopPropagation()}
            >
              <div class="agent-chat__toolbar-help-panel__header">${helpTitle}</div>
              <ul class="agent-chat__toolbar-help-panel__list">
                ${items.map(
                  (item) => html`
                    <li class="agent-chat__toolbar-help-panel__item">
                      <span class="agent-chat__toolbar-help-panel__icon" aria-hidden="true"
                        >${item.icon}</span
                      >
                      <span class="agent-chat__toolbar-help-panel__copy">
                        <span class="agent-chat__toolbar-help-panel__label">${item.label}</span>
                        <span class="agent-chat__toolbar-help-panel__description"
                          >${item.description}</span
                        >
                      </span>
                    </li>
                  `,
                )}
              </ul>
            </div>
          `
        : nothing}
    </div>
  `;
}
