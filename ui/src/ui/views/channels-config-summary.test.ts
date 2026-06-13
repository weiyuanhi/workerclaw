// Control UI tests cover channel config summary rows.
import { describe, expect, it } from "vitest";
import { buildChannelConfigSummaryRows } from "./channels-config-summary.ts";

describe("buildChannelConfigSummaryRows", () => {
  it("returns prioritized summary rows with masked secrets", () => {
    const rows = buildChannelConfigSummaryRows({
      channelId: "telegram",
      configForm: {
        channels: {
          telegram: {
            enabled: true,
            dmPolicy: "pairing",
            allowFrom: ["+15551234567", "+15559876543"],
            botToken: "secret-token",
          },
        },
      },
      hints: {},
    });

    expect(rows.map((row) => row.key)).toEqual(["enabled", "dmPolicy", "allowFrom", "botToken"]);
    expect(rows.find((row) => row.key === "enabled")?.value).toBe("Yes");
    expect(rows.find((row) => row.key === "allowFrom")?.value).toBe("2 allowed senders");
    expect(rows.find((row) => row.key === "botToken")?.value).toBe("Configured");
  });

  it("returns empty rows when channel config is missing", () => {
    expect(
      buildChannelConfigSummaryRows({
        channelId: "whatsapp",
        configForm: { channels: {} },
        hints: {},
      }),
    ).toEqual([]);
  });
});
