import { describe, expect, it, vi, beforeEach } from "vitest";

const { runExecMock, pathExistsMock, spawnMock } = vi.hoisted(() => ({
  runExecMock: vi.fn(),
  pathExistsMock: vi.fn(),
  spawnMock: vi.fn(),
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

import { startCursorHarnessLogin } from "./harness-auth-cursor.js";

describe("startCursorHarnessLogin", () => {
  beforeEach(() => {
    runExecMock.mockReset();
    pathExistsMock.mockReset();
    spawnMock.mockReset();
    pathExistsMock.mockRejectedValue(new Error("missing"));
  });

  it("rejects browser login when CURSOR_API_KEY is configured", async () => {
    const result = await startCursorHarnessLogin({
      cfg: {
        env: {
          vars: {
            CURSOR_API_KEY: "secret",
          },
        },
      },
      env: {},
    });

    expect(result.started).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("starts a detached cursor-agent login process", async () => {
    pathExistsMock.mockImplementation(async (filePath: string) =>
      String(filePath).endsWith(".local/bin/cursor-agent"),
    );
    spawnMock.mockReturnValue({
      pid: 4242,
      unref: vi.fn(),
      on: vi.fn(),
    });

    const result = await startCursorHarnessLogin({ cfg: {}, env: {} });

    expect(result).toEqual(
      expect.objectContaining({
        harnessId: "cursor",
        started: true,
        pid: 4242,
        cliCommand: expect.stringContaining("cursor-agent"),
      }),
    );
    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining("cursor-agent"),
      ["login"],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      }),
    );
    const spawnOptions = spawnMock.mock.calls[0]?.[2] as { env?: NodeJS.ProcessEnv };
    expect(spawnOptions.env?.NO_OPEN_BROWSER).toBeUndefined();
  });
});
