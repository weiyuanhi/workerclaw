import type { CommandRunner } from "./probe.js";
import { defaultCommandRunner, resolveBinaryPath } from "./probe.js";
import type { AppiumPlatform } from "./config.js";

export type AppiumSetupResult = {
  ok: boolean;
  appiumPath?: string;
  version?: string;
  installedDrivers: string[];
  skippedDrivers: string[];
  errors: string[];
  notes: string[];
};

export async function installAppiumGlobal(run: CommandRunner = defaultCommandRunner): Promise<{
  ok: boolean;
  error?: string;
}> {
  const npmPath = await resolveBinaryPath({ name: "npm", run });
  if (!npmPath) {
    return { ok: false, error: "npm is not on PATH. Install Node.js 20+ first." };
  }
  const result = await run({
    argv: [npmPath, "install", "-g", "appium@latest"],
    timeoutMs: 10 * 60_000,
  });
  if (result.code !== 0) {
    return {
      ok: false,
      error: result.stderr.trim() || result.stdout.trim() || "npm install -g appium failed",
    };
  }
  return { ok: true };
}

export async function installAppiumDrivers(params: {
  appiumPath: string;
  drivers: string[];
  run?: CommandRunner;
}): Promise<{ installed: string[]; skipped: string[]; errors: string[] }> {
  const run = params.run ?? defaultCommandRunner;
  const installed: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  for (const driver of params.drivers) {
    const result = await run({
      argv: [params.appiumPath, "driver", "install", driver],
      timeoutMs: 5 * 60_000,
    });
    if (result.code === 0) {
      installed.push(driver);
      continue;
    }
    const message = (result.stderr || result.stdout).trim();
    if (/already installed/i.test(message)) {
      skipped.push(driver);
      continue;
    }
    errors.push(`${driver}: ${message || `exit ${result.code}`}`);
  }
  return { installed, skipped, errors };
}

export function resolveSetupDrivers(params: {
  platforms: AppiumPlatform[];
  androidDriver: string;
  iosDriver: string;
}): string[] {
  const drivers = new Set<string>();
  if (params.platforms.includes("android")) {
    drivers.add(params.androidDriver);
  }
  if (params.platforms.includes("ios")) {
    drivers.add(params.iosDriver);
  }
  return [...drivers];
}

export async function setupAppiumEnvironment(params: {
  platforms: AppiumPlatform[];
  androidDriver: string;
  iosDriver: string;
  appiumPath?: string;
  run?: CommandRunner;
}): Promise<AppiumSetupResult> {
  const run = params.run ?? defaultCommandRunner;
  const notes: string[] = [];
  if (params.platforms.includes("ios") && process.platform !== "darwin") {
    return {
      ok: false,
      installedDrivers: [],
      skippedDrivers: [],
      errors: ["iOS Appium setup requires macOS with Xcode."],
      notes,
    };
  }
  let appiumPath =
    params.appiumPath ??
    (await resolveBinaryPath({
      name: "appium",
      configuredPath: params.appiumPath,
      run,
    }));
  if (!appiumPath) {
    const install = await installAppiumGlobal(run);
    if (!install.ok) {
      return {
        ok: false,
        installedDrivers: [],
        skippedDrivers: [],
        errors: [install.error ?? "Appium install failed"],
        notes,
      };
    }
    appiumPath = await resolveBinaryPath({ name: "appium", run });
    if (!appiumPath) {
      return {
        ok: false,
        installedDrivers: [],
        skippedDrivers: [],
        errors: [
          "Appium installed but the appium binary is not on PATH. Restart your shell or set plugins.entries.appium.config.appiumPath.",
        ],
        notes,
      };
    }
  }
  const drivers = resolveSetupDrivers(params);
  const driverResult = await installAppiumDrivers({
    appiumPath,
    drivers,
    run,
  });
  if (params.platforms.includes("android")) {
    notes.push("Android still requires platform-tools (adb) and a connected device or emulator.");
  }
  if (params.platforms.includes("ios")) {
    notes.push("iOS still requires Xcode, simulators or a provisioned device, and WebDriverAgent setup.");
  }
  const versionResult = await run({
    argv: [appiumPath, "--version"],
    timeoutMs: 15_000,
  });
  const version = versionResult.stdout.trim() || undefined;
  return {
    ok: driverResult.errors.length === 0,
    appiumPath,
    version,
    installedDrivers: driverResult.installed,
    skippedDrivers: driverResult.skipped,
    errors: driverResult.errors,
    notes,
  };
}
