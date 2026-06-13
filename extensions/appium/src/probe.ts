import type { PluginCommandRunResult } from "openclaw/plugin-sdk/run-command";
import { runPluginCommandWithTimeout } from "openclaw/plugin-sdk/run-command";

export type CommandRunner = (params: {
  argv: string[];
  timeoutMs: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}) => Promise<PluginCommandRunResult>;

export const defaultCommandRunner: CommandRunner = async (params) =>
  await runPluginCommandWithTimeout({
    argv: params.argv,
    timeoutMs: params.timeoutMs,
    cwd: params.cwd,
    env: params.env,
  });

export async function resolveBinaryPath(params: {
  name: string;
  configuredPath?: string;
  run?: CommandRunner;
}): Promise<string | null> {
  const explicit = params.configuredPath?.trim();
  if (explicit) {
    return explicit;
  }
  const run = params.run ?? defaultCommandRunner;
  if (process.platform === "win32") {
    const result = await run({
      argv: ["where", params.name],
      timeoutMs: 5_000,
    });
    const line = result.stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find(Boolean);
    return line ?? null;
  }
  const result = await run({
    argv: ["which", params.name],
    timeoutMs: 5_000,
  });
  const resolved = result.stdout.trim();
  return result.code === 0 && resolved ? resolved : null;
}

export async function readAppiumVersion(
  appiumPath: string,
  run: CommandRunner = defaultCommandRunner,
): Promise<string | undefined> {
  const result = await run({
    argv: [appiumPath, "--version"],
    timeoutMs: 15_000,
  });
  const version = result.stdout.trim() || result.stderr.trim();
  return result.code === 0 && version ? version : undefined;
}

export async function listInstalledDrivers(
  appiumPath: string,
  run: CommandRunner = defaultCommandRunner,
): Promise<string[]> {
  const result = await run({
    argv: [appiumPath, "driver", "list", "--installed"],
    timeoutMs: 30_000,
  });
  if (result.code !== 0) {
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("-") && !line.startsWith("Listing"))
    .map((line) => line.split(/\s+/)[0] ?? "")
    .filter(Boolean);
}

export async function probeServerHealth(serverUrl: string): Promise<boolean> {
  const base = serverUrl.replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/status`, {
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listAndroidDevices(params: {
  adbPath: string;
  run?: CommandRunner;
}): Promise<Array<{ id: string; state: string; details?: string }>> {
  const run = params.run ?? defaultCommandRunner;
  const result = await run({
    argv: [params.adbPath, "devices", "-l"],
    timeoutMs: 15_000,
  });
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "adb devices failed");
  }
  const devices: Array<{ id: string; state: string; details?: string }> = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("List of devices")) {
      continue;
    }
    const [id, state, ...rest] = trimmed.split(/\s+/);
    if (!id || !state) {
      continue;
    }
    devices.push({
      id,
      state,
      details: rest.join(" ").trim() || undefined,
    });
  }
  return devices;
}

export async function listIosSimulators(
  run: CommandRunner = defaultCommandRunner,
): Promise<Array<{ name: string; udid: string; state: string }>> {
  if (process.platform !== "darwin") {
    return [];
  }
  const result = await run({
    argv: ["xcrun", "simctl", "list", "devices", "available"],
    timeoutMs: 30_000,
  });
  if (result.code !== 0) {
    return [];
  }
  const simulators: Array<{ name: string; udid: string; state: string }> = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*(.+?)\s+\(([A-F0-9-]+)\)\s+\(([^)]+)\)\s*$/i);
    if (!match) {
      continue;
    }
    simulators.push({
      name: match[1]?.trim() ?? "",
      udid: match[2]?.trim() ?? "",
      state: match[3]?.trim() ?? "",
    });
  }
  return simulators;
}

export type AppiumProbeResult = {
  ready: boolean;
  platform: NodeJS.Platform;
  nodeVersion: string;
  appium: {
    installed: boolean;
    path?: string;
    version?: string;
    drivers: string[];
  };
  android: {
    adbInstalled: boolean;
    adbPath?: string;
    authorizedDevices: number;
    devices: Array<{ id: string; state: string; details?: string }>;
  };
  ios: {
    supported: boolean;
    simulators: Array<{ name: string; udid: string; state: string }>;
  };
  server: {
    url: string;
    healthy: boolean;
  };
  missing: string[];
  notes: string[];
};

export async function probeAppiumEnvironment(params: {
  appiumPath?: string;
  adbPath?: string;
  serverUrl: string;
  run?: CommandRunner;
}): Promise<AppiumProbeResult> {
  const run = params.run ?? defaultCommandRunner;
  const missing: string[] = [];
  const notes: string[] = [];
  const resolvedAppium = await resolveBinaryPath({
    name: "appium",
    configuredPath: params.appiumPath,
    run,
  });
  const resolvedAdb = await resolveBinaryPath({
    name: "adb",
    configuredPath: params.adbPath,
    run,
  });
  const npmPath = await resolveBinaryPath({ name: "npm", run });
  if (!npmPath) {
    missing.push("npm");
  }
  if (!resolvedAppium) {
    missing.push("appium");
    notes.push("Run appium_setup or `openclaw appium setup` to install Appium globally via npm.");
  }
  if (!resolvedAdb) {
    missing.push("adb");
    notes.push("Install Android platform-tools (adb) for Android device automation.");
  }
  const drivers = resolvedAppium ? await listInstalledDrivers(resolvedAppium, run) : [];
  const devices = resolvedAdb
    ? await listAndroidDevices({ adbPath: resolvedAdb, run }).catch(() => [])
    : [];
  const authorizedDevices = devices.filter((device) => device.state === "device").length;
  const serverHealthy = await probeServerHealth(params.serverUrl);
  const iosSupported = process.platform === "darwin";
  const simulators = iosSupported ? await listIosSimulators(run) : [];
  if (iosSupported && !simulators.length) {
    notes.push("No available iOS simulators detected. Install Xcode or boot a simulator.");
  }
  const ready =
    Boolean(resolvedAppium) &&
    drivers.length > 0 &&
    (authorizedDevices > 0 || simulators.length > 0) &&
    Boolean(npmPath);
  return {
    ready,
    platform: process.platform,
    nodeVersion: process.version,
    appium: {
      installed: Boolean(resolvedAppium),
      path: resolvedAppium ?? undefined,
      version: resolvedAppium ? await readAppiumVersion(resolvedAppium, run) : undefined,
      drivers,
    },
    android: {
      adbInstalled: Boolean(resolvedAdb),
      adbPath: resolvedAdb ?? undefined,
      authorizedDevices,
      devices,
    },
    ios: {
      supported: iosSupported,
      simulators,
    },
    server: {
      url: params.serverUrl,
      healthy: serverHealthy,
    },
    missing,
    notes,
  };
}
