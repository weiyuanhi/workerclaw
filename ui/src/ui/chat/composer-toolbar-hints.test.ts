// Control UI tests cover composer toolbar help behavior.
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderComposerToolbarHelp } from "./composer-toolbar-hints.ts";

describe("composer toolbar help", () => {
  it("renders the help panel when open", () => {
    const onComposerToolbarHelpToggle = vi.fn();
    const container = document.createElement("div");
    render(
      renderComposerToolbarHelp({
        canAbort: false,
        composerToolbarHelpOpen: true,
        connected: true,
        hasMessages: true,
        hasRealtimeTalk: true,
        hasRealtimeTalkOptions: true,
        isBusy: false,
        onComposerToolbarHelpToggle,
        showPlaybook: true,
      }),
      container,
    );

    expect(container.querySelector(".agent-chat__toolbar-help-panel")).not.toBeNull();
    expect(container.textContent).toContain("Attach file");
    expect(container.textContent).toContain("Create playbook");
    expect(container.textContent).toContain("Send");
  });

  it("toggles help from the guide button", () => {
    const onComposerToolbarHelpToggle = vi.fn();
    const container = document.createElement("div");
    render(
      renderComposerToolbarHelp({
        canAbort: true,
        composerToolbarHelpOpen: false,
        connected: true,
        hasMessages: true,
        hasRealtimeTalk: false,
        hasRealtimeTalkOptions: false,
        isBusy: true,
        onComposerToolbarHelpToggle,
        showPlaybook: false,
      }),
      container,
    );

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-controls="agent-chat-composer-toolbar-help-panel"]',
    );
    expect(button).toBeInstanceOf(HTMLButtonElement);
    button!.click();
    expect(onComposerToolbarHelpToggle).toHaveBeenCalledTimes(1);
  });
});
