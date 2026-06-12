import { describe, expect, it } from "vitest";
import {
  isUiOnlyBlockedUiTab,
  isUiOnlyProduct,
  shouldSkipChannelStartup,
  shouldSkipCronService,
} from "./ui-only.js";

describe("ui-only product mode", () => {
  it("is enabled in this fork", () => {
    expect(isUiOnlyProduct()).toBe(true);
  });

  it("blocks removed messaging UI tabs", () => {
    expect(isUiOnlyBlockedUiTab("channels")).toBe(true);
    expect(isUiOnlyBlockedUiTab("cron")).toBe(true);
    expect(isUiOnlyBlockedUiTab("chat")).toBe(false);
  });

  it("skips channel and cron runtime services", () => {
    expect(shouldSkipChannelStartup()).toBe(true);
    expect(shouldSkipCronService()).toBe(true);
  });
});
