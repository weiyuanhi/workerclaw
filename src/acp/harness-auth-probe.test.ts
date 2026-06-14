import { describe, expect, it, vi, beforeEach } from "vitest";
import { probeCursorHarnessAuth } from "./harness-auth-probe.js";

const { runExecMock, pathExistsMock } = vi.hoisted(() => ({
  runExecMock: vi.fn(),
  pathExistsMock: vi.fn(),
}));

vi.mock("../process/exec.js", () => ({
  runExec: runExecMock,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: pathExistsMock,
  },
}));

describe("probeCursorHarnessAuth", () => {
  beforeEach(() => {
    runExecMock.mockReset();
    pathExistsMock.mockReset();
    pathExistsMock.mockRejectedValue(new Error("missing"));
  });

  it("reports api_key when CURSOR_API_KEY is configured", async () => {
    const result = await probeCursorHarnessAuth({
      cfg: {
        env: {
          vars: {
            CURSOR_API_KEY: "test-key",
          },
        },
      },
      env: {},
    });

    expect(result).toEqual(
      expect.objectContaining({
        harnessId: "cursor",
        state: "api_key",
        envVar: "CURSOR_API_KEY",
      }),
    );
    expect(runExecMock).not.toHaveBeenCalled();
  });

  it("reports logged_out from cursor-agent status output", async () => {
    pathExistsMock.mockImplementation(async (filePath: string) =>
      String(filePath).endsWith(".local/bin/cursor-agent"),
    );
    runExecMock.mockResolvedValue({ stdout: "Not logged in\n", stderr: "" });

    const result = await probeCursorHarnessAuth({ cfg: {}, env: {} });

    expect(result).toEqual(
      expect.objectContaining({
        harnessId: "cursor",
        state: "logged_out",
        cliCommand: expect.stringContaining("cursor-agent"),
        loginCommand: expect.stringContaining("login"),
      }),
    );
    expect(runExecMock).toHaveBeenCalledWith(
      expect.stringContaining("cursor-agent"),
      ["status"],
      expect.objectContaining({ timeoutMs: 8_000 }),
    );
  });

  it("reports missing_cli when cursor-agent is not found", async () => {
    runExecMock.mockRejectedValue(new Error("not found"));

    const result = await probeCursorHarnessAuth({ cfg: {}, env: {} });

    expect(result).toEqual(
      expect.objectContaining({
        harnessId: "cursor",
        state: "missing_cli",
      }),
    );
  });
});
