import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandRunner } from "./probe.js";
import { resetManagedAppiumServerForTests, runAppiumTestCommand } from "./run.js";

describe("runAppiumTestCommand", () => {
  afterEach(() => {
    resetManagedAppiumServerForTests();
  });

  it("runs command with APPIUM_SERVER_URL when server is already healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true })),
    );
    const run: CommandRunner = vi.fn(async ({ env }) => ({
      code: 0,
      stdout: env?.APPIUM_SERVER_URL ?? "",
      stderr: "",
    }));
    const result = await runAppiumTestCommand({
      config: {
        serverPort: 4723,
        serverUrl: "http://127.0.0.1:4723",
        testWorkdir: "/tmp/tests",
        defaultPlatform: "android",
        autoStartServer: true,
        runTimeoutSec: 60,
        androidDriver: "uiautomator2",
        iosDriver: "xcuitest",
      },
      command: "echo ready",
      run,
    });
    expect(result.ok).toBe(true);
    expect(result.stdout).toBe("http://127.0.0.1:4723");
    expect(result.serverStarted).toBe(false);
    vi.unstubAllGlobals();
  });
});
