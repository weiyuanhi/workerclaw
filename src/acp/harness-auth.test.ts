import { describe, expect, it, vi, beforeEach } from "vitest";

const { runExecMock, pathExistsMock, spawnMock, readClaudeMock, readCodexMock, readGeminiMock } =
  vi.hoisted(() => ({
    runExecMock: vi.fn(),
    pathExistsMock: vi.fn(),
    spawnMock: vi.fn(),
    readClaudeMock: vi.fn(),
    readCodexMock: vi.fn(),
    readGeminiMock: vi.fn(),
  }));

vi.mock("../process/exec.js", () => ({
  runExec: runExecMock,
  resolveCommandEnv: ({ argv, env }: { argv: string[]; env?: NodeJS.ProcessEnv }) => ({
    ...(env ?? process.env),
    PATH: env?.PATH ?? process.env.PATH,
    argvJoined: argv.join(" "),
  }),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: pathExistsMock,
  },
}));

vi.mock("../agents/cli-credentials.js", () => ({
  readClaudeCliCredentialsCached: readClaudeMock,
  readCodexCliCredentialsCached: readCodexMock,
  readGeminiCliCredentialsCached: readGeminiMock,
}));

import { probeHarnessAuth, startHarnessLogin } from "./harness-auth.js";
import { resolveAcpHarnessAuthSpec } from "../shared/acp-harness-auth-spec.js";

describe("harness auth", () => {
  beforeEach(() => {
    runExecMock.mockReset();
    pathExistsMock.mockReset();
    spawnMock.mockReset();
    readClaudeMock.mockReset();
    readCodexMock.mockReset();
    readGeminiMock.mockReset();
    pathExistsMock.mockRejectedValue(new Error("missing"));
    readClaudeMock.mockReturnValue(null);
    readCodexMock.mockReturnValue(null);
    readGeminiMock.mockReturnValue(null);
  });

  it("reports api_key when a harness env var is configured", async () => {
    const spec = resolveAcpHarnessAuthSpec("cursor");
    expect(spec).toBeDefined();
    const result = await probeHarnessAuth({
      spec: spec!,
      cfg: {
        env: {
          vars: {
            CURSOR_API_KEY: "test-key",
          },
        },
      },
      env: {},
    });

    expect(result.state).toBe("api_key");
    expect(runExecMock).not.toHaveBeenCalled();
  });

  it("reports logged_in from Claude credential storage", async () => {
    readClaudeMock.mockReturnValue({ type: "oauth" });
    const spec = resolveAcpHarnessAuthSpec("claude");
    const result = await probeHarnessAuth({ spec: spec!, cfg: {}, env: {} });
    expect(result.state).toBe("logged_in");
  });

  it("starts a detached login process for supported harnesses", async () => {
    pathExistsMock.mockImplementation(async (filePath: string) =>
      String(filePath).endsWith(".local/bin/cursor-agent"),
    );
    spawnMock.mockReturnValue({
      pid: 4242,
      unref: vi.fn(),
      on: vi.fn(),
    });

    const result = await startHarnessLogin({ harnessId: "cursor", cfg: {}, env: {} });
    expect(result.started).toBe(true);
    expect(spawnMock).toHaveBeenCalled();
  });

  it("rejects browser login for harnesses without login support", async () => {
    const result = await startHarnessLogin({ harnessId: "gemini", cfg: {}, env: {} });
    expect(result.started).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
