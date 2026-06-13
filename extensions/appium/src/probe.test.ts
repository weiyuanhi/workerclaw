import { describe, expect, it, vi } from "vitest";
import type { CommandRunner } from "./probe.js";
import { listAndroidDevices, probeAppiumEnvironment } from "./probe.js";

describe("listAndroidDevices", () => {
  it("parses adb devices -l output", async () => {
    const run: CommandRunner = vi.fn(async () => ({
      code: 0,
      stdout: [
        "List of devices attached",
        "emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1",
      ].join("\n"),
      stderr: "",
    }));
    const devices = await listAndroidDevices({ adbPath: "/usr/bin/adb", run });
    expect(devices).toEqual([
      {
        id: "emulator-5554",
        state: "device",
        details: "product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1",
      },
    ]);
  });
});

describe("probeAppiumEnvironment", () => {
  it("reports missing appium and adb", async () => {
    const run: CommandRunner = vi.fn(async ({ argv }) => {
      if (argv[0] === "which" || argv[0] === "where") {
        return { code: 1, stdout: "", stderr: "" };
      }
      return { code: 0, stdout: "", stderr: "" };
    });
    const status = await probeAppiumEnvironment({
      serverUrl: "http://127.0.0.1:4723",
      run,
    });
    expect(status.ready).toBe(false);
    expect(status.missing).toContain("appium");
    expect(status.missing).toContain("adb");
    expect(status.notes.some((note) => note.includes("appium_setup"))).toBe(true);
  });
});
