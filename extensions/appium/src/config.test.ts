import { describe, expect, it } from "vitest";
import { resolveAppiumConfig, resolvePlatforms } from "./config.js";

describe("resolveAppiumConfig", () => {
  it("applies defaults and workspace fallback", () => {
    const config = resolveAppiumConfig({
      pluginConfig: {},
      config: {
        agents: { defaults: { workspace: "/tmp/mobile-tests" } },
      },
    });
    expect(config.serverPort).toBe(4723);
    expect(config.serverUrl).toBe("http://127.0.0.1:4723");
    expect(config.testWorkdir).toBe("/tmp/mobile-tests");
    expect(config.defaultPlatform).toBe("android");
    expect(config.autoStartServer).toBe(true);
    expect(config.androidDriver).toBe("uiautomator2");
  });
});

describe("resolvePlatforms", () => {
  it("uses requested platform when provided", () => {
    expect(
      resolvePlatforms("ios", {
        defaultPlatform: "android",
      } as never),
    ).toEqual(["ios"]);
  });
});
