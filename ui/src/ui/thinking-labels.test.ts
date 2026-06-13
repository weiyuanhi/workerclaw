// Control UI tests cover localized thinking label formatting.
import { describe, expect, it, afterEach } from "vitest";
import { i18n } from "../i18n/index.ts";
import {
  formatInheritedThinkingLabel,
  formatThinkingLevelDisplayLabel,
  formatThinkingOverrideLabel,
} from "./thinking-labels.ts";

describe("thinking-labels", () => {
  afterEach(() => {
    i18n.setLocale("en");
  });

  it("formats English inherited thinking labels", () => {
    expect(formatInheritedThinkingLabel("high")).toBe("Inherited: High");
    expect(formatThinkingOverrideLabel("off")).toBe("Off");
  });

  it("formats Simplified Chinese inherited thinking labels", () => {
    i18n.setLocale("zh-CN");
    expect(formatInheritedThinkingLabel("high")).toBe("继承：高");
    expect(formatThinkingLevelDisplayLabel("adaptive")).toBe("自适应");
    expect(formatThinkingOverrideLabel("off")).toBe("关闭");
  });
});
