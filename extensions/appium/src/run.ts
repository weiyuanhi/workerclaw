import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  SERVER_POLL_INTERVAL_MS,
  SERVER_READY_TIMEOUT_MS,
  type ResolvedAppiumConfig,
} from "./config.js";
import { defaultCommandRunner, probeServerHealth, resolveBinaryPath } from "./probe.js";
import type { CommandRunner } from "./probe.js";

let managedServer: ChildProcessWithoutNullStreams | null = null;

export function getManagedAppiumServerPid(): number | undefined {
  return managedServer?.pid;
}

export function resetManagedAppiumServerForTests(): void {
  managedServer = null;
}

export async function stopManagedAppiumServer(): Promise<void> {
  const current = managedServer;
  managedServer = null;
  if (!current || current.killed) {
    return;
  }
  current.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (!current.killed) {
        current.kill("SIGKILL");
      }
      resolve();
    }, 5_000);
    current.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitForServerReady(serverUrl: string, timeoutMs: number): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probeServerHealth(serverUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
  }
  return false;
}

export async function ensureAppiumServer(params: {
  config: ResolvedAppiumConfig;
  run?: CommandRunner;
}): Promise<{ started: boolean; url: string; error?: string }> {
  const url = params.config.serverUrl;
  if (await probeServerHealth(url)) {
    return { started: false, url };
  }
  if (!params.config.autoStartServer) {
    return {
      started: false,
      url,
      error: `Appium server is not healthy at ${url}. Start it manually or enable autoStartServer.`,
    };
  }
  const run = params.run ?? defaultCommandRunner;
  const appiumPath = await resolveBinaryPath({
    name: "appium",
    configuredPath: params.config.appiumPath,
    run,
  });
  if (!appiumPath) {
    return {
      started: false,
      url,
      error: "Appium CLI not found. Run appium_setup first.",
    };
  }
  if (managedServer && !managedServer.killed) {
    const ready = await waitForServerReady(url, SERVER_READY_TIMEOUT_MS);
    if (ready) {
      return { started: false, url };
    }
    await stopManagedAppiumServer();
  }
  const child = spawn(
    appiumPath,
    ["--address", "127.0.0.1", "--port", String(params.config.serverPort)],
    {
      stdio: "ignore",
      env: process.env,
    },
  );
  const childPid = child.pid;
  managedServer = child;
  child.once("exit", () => {
    if (managedServer?.pid === childPid) {
      managedServer = null;
    }
  });
  const ready = await waitForServerReady(url, SERVER_READY_TIMEOUT_MS);
  if (!ready) {
    await stopManagedAppiumServer();
    return {
      started: false,
      url,
      error: `Timed out waiting for Appium server at ${url}`,
    };
  }
  return { started: true, url };
}

export type AppiumRunResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
  serverUrl: string;
  serverStarted: boolean;
  workdir: string;
  command: string;
};

export async function runAppiumTestCommand(params: {
  config: ResolvedAppiumConfig;
  command: string;
  workdir?: string;
  env?: Record<string, string>;
  startServer?: boolean;
  timeoutSec?: number;
  run?: CommandRunner;
}): Promise<AppiumRunResult> {
  const run = params.run ?? defaultCommandRunner;
  const workdir = params.workdir?.trim() || params.config.testWorkdir || process.cwd();
  const timeoutSec = params.timeoutSec ?? params.config.runTimeoutSec;
  let serverStarted = false;
  let serverUrl = params.config.serverUrl;
  if (params.startServer !== false) {
    const server = await ensureAppiumServer({ config: params.config, run });
    serverUrl = server.url;
    serverStarted = server.started;
    if (server.error) {
      return {
        ok: false,
        code: 1,
        stdout: "",
        stderr: server.error,
        serverUrl,
        serverStarted,
        workdir,
        command: params.command,
      };
    }
  }
  const env = {
    ...process.env,
    ...params.env,
    APPIUM_SERVER_URL: serverUrl,
    APPIUM_PORT: String(params.config.serverPort),
  };
  const shell = process.platform === "win32" ? "cmd.exe" : "bash";
  const shellArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", params.command] : ["-lc", params.command];
  const result = await run({
    argv: [shell, ...shellArgs],
    cwd: workdir,
    env,
    timeoutMs: timeoutSec * 1000,
  });
  return {
    ok: result.code === 0,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    serverUrl,
    serverStarted,
    workdir,
    command: params.command,
  };
}
