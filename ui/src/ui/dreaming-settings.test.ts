import { describe, expect, it } from "vitest";
import {
  buildDreamingConfigPayload,
  createDefaultDreamingSettingsDraft,
  resolveDreamingFrequencyFromPreset,
  resolveDreamingSettingsFromConfig,
  resolveDreamingTimezoneOptions,
} from "./dreaming-settings.ts";

describe("dreaming settings helpers", () => {
  it("reads dreaming settings from config", () => {
    const draft = resolveDreamingSettingsFromConfig({
      plugins: {
        entries: {
          "memory-core": {
            config: {
              dreaming: {
                enabled: true,
                frequency: "0 */6 * * *",
                timezone: "Asia/Shanghai",
                model: "anthropic/claude-sonnet-4-6",
                phases: {
                  light: { enabled: true },
                  rem: { enabled: false },
                  deep: { enabled: true, maxPromotedSnippetTokens: 200 },
                },
              },
            },
          },
        },
      },
    });

    expect(draft.enabled).toBe(true);
    expect(draft.frequencyPreset).toBe("every6h");
    expect(draft.timezone).toBe("Asia/Shanghai");
    expect(draft.model).toBe("anthropic/claude-sonnet-4-6");
    expect(draft.maxPromotedSnippetTokens).toBe(200);
    expect(draft.phases.rem).toBe(false);
  });

  it("builds config payload from draft", () => {
    const payload = buildDreamingConfigPayload(
      createDefaultDreamingSettingsDraft({
        enabled: true,
        frequencyPreset: "every12h",
        timezone: "UTC",
        model: "openai/gpt-5.5",
        maxPromotedSnippetTokens: 128,
        phases: { light: true, rem: true, deep: false },
      }),
    );

    expect(payload).toEqual({
      enabled: true,
      frequency: "0 */12 * * *",
      timezone: "UTC",
      model: "openai/gpt-5.5",
      phases: {
        light: { enabled: true },
        rem: { enabled: true },
        deep: { enabled: false, maxPromotedSnippetTokens: 128 },
      },
    });
  });

  it("uses custom cron when preset is custom", () => {
    expect(
      resolveDreamingFrequencyFromPreset("custom", "15 4 * * 1"),
    ).toBe("15 4 * * 1");
  });

  it("includes local and current timezone options", () => {
    expect(
      resolveDreamingTimezoneOptions({
        current: "Europe/Paris",
        localTimezone: "Asia/Shanghai",
      }),
    ).toEqual([
      "Asia/Shanghai",
      "UTC",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "Europe/London",
      "Europe/Berlin",
      "Asia/Hong_Kong",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Europe/Paris",
    ]);
  });
});
