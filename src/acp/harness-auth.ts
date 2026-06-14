/** Probes and launches ACP harness CLI authentication for Control UI setup surfaces. */
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  readClaudeCliCredentialsCached,
  readCodexCliCredentialsCached,
  readGeminiCliCredentialsCached,
} from "../agents/cli-credentials.js";
import { createConfigRuntimeEnv } from "../config/config-env-vars.js";
import { runExec, resolveCommandEnv } from "../process/exec.js";
import type { AcpHarnessAuthEntry, AcpHarnessAuthState } from "../shared/acp-setup-catalog.js";
import {
  type AcpHarnessAuthSpec,
  resolveAcpHarnessAuthSpec,
} from "../shared/acp-harness-auth-spec.js";

export { CURSOR_API_KEY_ENV, CURSOR_HARNESS_ID } from "../shared/acp-harness-auth-spec.js";

const PROBE_TIMEOUT_MS = 8_000;

type AcpxAgentCommandShape = {
  plugins?: {
    entries?: {
      acpx?: {
        config?: {
          agents?: Record<string, { command?: unknown }>;
        };
      };
    };
  };
};

function firstCommandToken(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^"([^"]+)"|^'([^']+)'|^(\S+)/);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function resolveHarnessAgentOverride(
  cfg: AcpxAgentCommandShape | null | undefined,
  harnessId: string,
): string | null {
  const command = cfg?.plugins?.entries?.acpx?.config?.agents?.[harnessId]?.command;
  if (typeof command !== "string") {
    return null;
  }
  return firstCommandToken(command);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Resolves the harness CLI binary used for auth probes and login launch. */
export async function resolveHarnessCliPath(params: {
  spec: AcpHarnessAuthSpec;
  cfg?: AcpxAgentCommandShape | null;
  env: NodeJS.ProcessEnv;
}): Promise<string | null> {
  const override = resolveHarnessAgentOverride(params.cfg, params.spec.harnessId);
  if (override) {
    if (path.isAbsolute(override)) {
      return (await pathExists(override)) ? override : null;
    }
    try {
      const { stdout } = await runExec("which", [override], { timeoutMs: 2_000 });
      const resolved = stdout.trim().split("\n")[0]?.trim();
      return resolved || null;
    } catch {
      return null;
    }
  }

  if (params.spec.harnessId === "cursor") {
    const localInstall = path.join(os.homedir(), ".local", "bin", params.spec.cliBinary);
    if (await pathExists(localInstall)) {
      return localInstall;
    }
  }

  try {
    const { stdout } = await runExec("which", [params.spec.cliBinary], { timeoutMs: 2_000 });
    const resolved = stdout.trim().split("\n")[0]?.trim();
    return resolved || null;
  } catch {
    return null;
  }
}

export function buildHarnessLoginCommand(
  spec: AcpHarnessAuthSpec,
  cliPath: string | null | undefined,
): string {
  const args = spec.loginArgs?.join(" ") ?? "login";
  return cliPath ? `${cliPath} ${args}` : `${spec.cliBinary} ${args}`;
}

function summarizeProbeOutput(stdout: string, stderr: string): string {
  const combined = `${stdout}\n${stderr}`.trim();
  return combined.split("\n").find((line) => line.trim())?.trim() ?? combined;
}

function resolveStateFromStatusOutput(output: string): AcpHarnessAuthState {
  if (/not logged in|not authenticated|authentication required|no authentication/i.test(output)) {
    return "logged_out";
  }
  if (/logged in|signed in|authenticated|auth:\s*ok/i.test(output)) {
    return "logged_in";
  }
  return "probe_failed";
}

function resolveConfiguredEnvVar(
  env: NodeJS.ProcessEnv,
  spec: AcpHarnessAuthSpec,
): string | undefined {
  for (const envVar of spec.envVars) {
    const value = env[envVar.key]?.trim();
    if (value) {
      return envVar.key;
    }
  }
  return undefined;
}

function probeCredentialReader(
  reader: NonNullable<AcpHarnessAuthSpec["credentialReader"]>,
): boolean {
  if (reader === "claude") {
    return Boolean(readClaudeCliCredentialsCached({ allowKeychainPrompt: false }));
  }
  if (reader === "codex") {
    return Boolean(readCodexCliCredentialsCached());
  }
  return Boolean(readGeminiCliCredentialsCached());
}

/** Probes one harness auth entry for Control UI and diagnostics. */
export async function probeHarnessAuth(params: {
  spec: AcpHarnessAuthSpec;
  cfg?: OpenClawConfig | null;
  env?: NodeJS.ProcessEnv;
}): Promise<AcpHarnessAuthEntry> {
  const runtimeEnv = createConfigRuntimeEnv(params.cfg ?? {}, params.env ?? process.env);
  const loginCommand = buildHarnessLoginCommand(params.spec, null);
  const configuredEnvVar = resolveConfiguredEnvVar(runtimeEnv, params.spec);

  if (configuredEnvVar) {
    return {
      harnessId: params.spec.harnessId,
      state: "api_key",
      message: `${configuredEnvVar} is configured.`,
      envVar: configuredEnvVar,
      loginCommand,
    };
  }

  if (params.spec.credentialReader && probeCredentialReader(params.spec.credentialReader)) {
    return {
      harnessId: params.spec.harnessId,
      state: "logged_in",
      message: "CLI credentials are present on the Gateway host.",
      loginCommand,
    };
  }

  const cliPath = await resolveHarnessCliPath({
    spec: params.spec,
    cfg: params.cfg,
    env: runtimeEnv,
  });
  const resolvedLoginCommand = buildHarnessLoginCommand(params.spec, cliPath);

  if (!cliPath && params.spec.envVars.length === 0) {
    return {
      harnessId: params.spec.harnessId,
      state: "unsupported",
      message: params.spec.manualLoginHint,
      loginCommand: resolvedLoginCommand,
    };
  }

  if (!cliPath) {
    return {
      harnessId: params.spec.harnessId,
      state: "missing_cli",
      message: `${params.spec.cliBinary} CLI was not found on PATH.`,
      loginCommand: resolvedLoginCommand,
    };
  }

  if (params.spec.statusArgs?.length) {
    try {
      const { stdout, stderr } = await runExec(cliPath, [...params.spec.statusArgs], {
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      const summary = summarizeProbeOutput(stdout, stderr);
      const state = resolveStateFromStatusOutput(summary);
      return {
        harnessId: params.spec.harnessId,
        state,
        message: summary || undefined,
        cliCommand: cliPath,
        loginCommand: resolvedLoginCommand,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Harness login probe failed.";
      return {
        harnessId: params.spec.harnessId,
        state: "probe_failed",
        message,
        cliCommand: cliPath,
        loginCommand: resolvedLoginCommand,
      };
    }
  }

  return {
    harnessId: params.spec.harnessId,
    state: params.spec.supportsBrowserLogin ? "logged_out" : "unsupported",
    message: params.spec.manualLoginHint ?? "Authenticate the harness CLI on the Gateway host.",
    cliCommand: cliPath,
    loginCommand: resolvedLoginCommand,
  };
}

export type HarnessLoginResult = {
  harnessId: string;
  started: boolean;
  message: string;
  cliCommand?: string;
  pid?: number;
};

/** Starts a detached harness CLI login on the Gateway host so it can open the system browser. */
export async function startHarnessLogin(params: {
  harnessId: string;
  cfg?: OpenClawConfig | null;
  env?: NodeJS.ProcessEnv;
}): Promise<HarnessLoginResult> {
  const spec = resolveAcpHarnessAuthSpec(params.harnessId);
  if (!spec) {
    return {
      harnessId: params.harnessId,
      started: false,
      message: `Unsupported harness: ${params.harnessId}`,
    };
  }
  if (!spec.supportsBrowserLogin || !spec.loginArgs?.length) {
    return {
      harnessId: spec.harnessId,
      started: false,
      message: spec.manualLoginHint ?? "Browser login is not available for this harness.",
    };
  }

  const runtimeEnv = createConfigRuntimeEnv(params.cfg ?? {}, params.env ?? process.env);
  const configuredEnvVar = resolveConfiguredEnvVar(runtimeEnv, spec);
  if (configuredEnvVar) {
    return {
      harnessId: spec.harnessId,
      started: false,
      message: `${configuredEnvVar} is already configured. Remove it before browser login.`,
    };
  }

  const cliPath = await resolveHarnessCliPath({
    spec,
    cfg: params.cfg,
    env: runtimeEnv,
  });
  const loginCommand = buildHarnessLoginCommand(spec, cliPath);

  if (!cliPath) {
    return {
      harnessId: spec.harnessId,
      started: false,
      message: `${spec.cliBinary} CLI was not found on PATH.`,
      cliCommand: loginCommand,
    };
  }

  const argv = [cliPath, ...spec.loginArgs];
  const childEnv = resolveCommandEnv({ argv, env: runtimeEnv });
  if (spec.clearBrowserBlockEnvVar) {
    delete childEnv[spec.clearBrowserBlockEnvVar];
  }

  try {
    const child = spawn(cliPath, [...spec.loginArgs], {
      detached: true,
      stdio: "ignore",
      env: childEnv,
      windowsHide: true,
    });
    child.on("error", () => {
      // Detached launch errors are surfaced through the synchronous throw path when possible.
    });
    if (!child.pid) {
      return {
        harnessId: spec.harnessId,
        started: false,
        message: `Failed to start ${spec.displayName} login process.`,
        cliCommand: cliPath,
      };
    }
    child.unref();
    return {
      harnessId: spec.harnessId,
      started: true,
      message: `${spec.displayName} login started on the Gateway host. Complete sign-in in the browser, then refresh status here.`,
      cliCommand: cliPath,
      pid: child.pid,
    };
  } catch (err) {
    return {
      harnessId: spec.harnessId,
      started: false,
      message:
        err instanceof Error
          ? err.message
          : `Failed to start ${spec.displayName} login process on Gateway host.`,
      cliCommand: cliPath,
    };
  }
}

/** Probes harness auth entries for catalog harness ids supported by this helper. */
export async function resolveAcpHarnessAuthEntries(params: {
  cfg?: OpenClawConfig | null;
  harnessIds?: readonly string[];
  env?: NodeJS.ProcessEnv;
}): Promise<AcpHarnessAuthEntry[]> {
  const entries: AcpHarnessAuthEntry[] = [];
  for (const harnessId of params.harnessIds ?? []) {
    const spec = resolveAcpHarnessAuthSpec(harnessId);
    if (!spec) {
      continue;
    }
    entries.push(
      await probeHarnessAuth({
        spec,
        cfg: params.cfg,
        env: params.env,
      }),
    );
  }
  return entries;
}

/** Backward-compatible Cursor probe entry point. */
export async function probeCursorHarnessAuth(params: {
  cfg?: OpenClawConfig | null;
  env?: NodeJS.ProcessEnv;
}): Promise<AcpHarnessAuthEntry> {
  const spec = resolveAcpHarnessAuthSpec("cursor");
  if (!spec) {
    return {
      harnessId: "cursor",
      state: "unsupported",
      message: "Cursor harness auth spec is unavailable.",
    };
  }
  return probeHarnessAuth({ spec, cfg: params.cfg, env: params.env });
}

/** Backward-compatible Cursor login entry point. */
export async function startCursorHarnessLogin(params: {
  cfg?: OpenClawConfig | null;
  env?: NodeJS.ProcessEnv;
}): Promise<HarnessLoginResult> {
  return startHarnessLogin({ harnessId: "cursor", cfg: params.cfg, env: params.env });
}
