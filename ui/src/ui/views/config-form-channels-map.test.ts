// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildChannelListRows, isChannelsMapPath } from "./config-form-channels-map.ts";

describe("config-form-channels-map", () => {
  it("detects the top-level channels config path", () => {
    expect(isChannelsMapPath(["channels"])).toBe(true);
    expect(isChannelsMapPath(["models", "providers"])).toBe(false);
  });

  it("lists schema channels and configured plugin channels together", () => {
    const rows = buildChannelListRows({
      schema: {
        type: "object",
        properties: {
          telegram: { type: "object", title: "Telegram" },
          whatsapp: { type: "object", title: "WhatsApp" },
        },
      },
      configured: {
        telegram: { enabled: true, dmPolicy: "pairing" },
        "openclaw-weixin": { enabled: true },
      },
      hints: {},
    });

    expect(rows.map((row) => row.id)).toEqual(["openclaw-weixin", "telegram", "whatsapp"]);
    expect(rows.find((row) => row.id === "telegram")?.label).toBe("Telegram");
    expect(rows.find((row) => row.id === "telegram")?.configured).toBe(true);
    expect(rows.find((row) => row.id === "whatsapp")?.configured).toBe(false);
    expect(rows.find((row) => row.id === "openclaw-weixin")?.summaryRows.length).toBeGreaterThan(0);
  });
});
