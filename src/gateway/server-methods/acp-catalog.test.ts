import { describe, expect, it, vi } from "vitest";
import { acpCatalogHandlers } from "./acp-catalog.js";

vi.mock("../../acp/harness-auth-probe.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../acp/harness-auth-probe.js")>();
  return {
    ...actual,
    resolveAcpHarnessAuthEntries: vi.fn(async () => [
      {
        harnessId: "cursor",
        state: "logged_out",
        message: "Not logged in",
        loginCommand: "cursor-agent login",
      },
      {
        harnessId: "claude",
        state: "logged_in",
        message: "CLI credentials are present on the Gateway host.",
      },
    ]),
  };
});

vi.mock("../../acp/harness-auth.js", () => ({
  startHarnessLogin: vi.fn(async ({ harnessId }: { harnessId: string }) => ({
    harnessId,
    started: true,
    message: `${harnessId} login started on the Gateway host.`,
    cliCommand: `/usr/local/bin/${harnessId}`,
    pid: 99,
  })),
}));

import { startHarnessLogin } from "../../acp/harness-auth.js";
import { resolveAcpHarnessAuthEntries } from "../../acp/harness-auth-probe.js";

describe("acp.catalog handler", () => {
  it("returns backend, harness, and harness auth catalog entries", async () => {
    const respond = vi.fn();
    await acpCatalogHandlers["acp.catalog"]({
      params: {},
      respond,
      context: {
        getRuntimeConfig: () => ({}),
      },
    } as never);

    expect(resolveAcpHarnessAuthEntries).toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        harnessAuth: expect.arrayContaining([
          expect.objectContaining({ harnessId: "cursor", state: "logged_out" }),
          expect.objectContaining({ harnessId: "claude", state: "logged_in" }),
        ]),
      }),
      undefined,
    );
  });
});

describe("acp.harnessAuth.login handler", () => {
  it("starts browser login for supported harnesses", async () => {
    const respond = vi.fn();
    await acpCatalogHandlers["acp.harnessAuth.login"]({
      params: { harnessId: "claude" },
      respond,
      context: {
        getRuntimeConfig: () => ({}),
      },
    } as never);

    expect(startHarnessLogin).toHaveBeenCalledWith(
      expect.objectContaining({ harnessId: "claude" }),
    );
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        harnessId: "claude",
        started: true,
        pid: 99,
      }),
      undefined,
    );
  });
});
