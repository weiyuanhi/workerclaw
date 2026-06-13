import { describe, expect, it } from "vitest";
import {
  isUiOnlyBlockedUiTab,
  isUiOnlyProduct,
  shouldSkipChannelStartup,
  shouldSkipCronService,
} from "./ui-only.js";

describe("ui-only product mode", () => {
  it("is disabled so channels can run in this fork", () => {
    expect(isUiOnlyProduct()).toBe(false);
  });

  it("does not block messaging UI tabs when product mode is off", () => {
    expect(isUiOnlyBlockedUiTab("channels")).toBe(false);
    expect(isUiOnlyBlockedUiTab("cron")).toBe(false);
    expect(isUiOnlyBlockedUiTab("chat")).toBe(false);
  });

  it("does not skip channel and cron runtime services when product mode is off", () => {
    expect(shouldSkipChannelStartup()).toBe(false);
    expect(shouldSkipCronService()).toBe(false);
  });
});
