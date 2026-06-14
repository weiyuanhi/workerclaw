import { describe, expect, it } from "vitest";
import {
  ACPX_BUILTIN_HARNESS_IDS,
  mergeAcpHarnessIds,
  resolveAcpxCustomHarnessIds,
  resolveAcpBackendCatalogEntries,
  resolveAcpSetupCatalog,
  resolveSuggestedAcpBackendId,
} from "../shared/acp-setup-catalog.js";
import { registerAcpRuntimeBackend, testing as registryTesting } from "./runtime/registry.js";
import { resolveAcpSetupCatalog as resolveGatewayAcpSetupCatalog } from "./catalog.js";

describe("acp setup catalog", () => {
  it("merges built-in and custom harness ids in stable order", () => {
    const cfg = {
      plugins: {
        entries: {
          acpx: {
            config: {
              agents: {
                "my-tool": { command: "tool" },
              },
            },
          },
        },
      },
    } as const;

    expect(resolveAcpxCustomHarnessIds(cfg)).toEqual(["my-tool"]);
    expect(mergeAcpHarnessIds({ cfg })).toEqual([...ACPX_BUILTIN_HARNESS_IDS, "my-tool"]);
  });

  it("includes known acpx backend even when not registered", () => {
    expect(resolveAcpBackendCatalogEntries()).toEqual([
      { id: "acpx", registered: false, healthy: null },
    ]);
  });

  it("reports registered backend health from runtime registry", () => {
    registryTesting.resetAcpRuntimeBackendsForTests();
    registerAcpRuntimeBackend({
      id: "acpx",
      runtime: {
        ensureSession: async () => ({
          sessionKey: "agent:codex:acp:test",
          backend: "acpx",
          runtimeSessionName: "codex",
        }),
        runTurn: async function* () {},
        cancel: async () => {},
        close: async () => {},
      },
      healthy: () => true,
    });

    expect(resolveGatewayAcpSetupCatalog({}).backends).toEqual([
      { id: "acpx", registered: true, healthy: true },
    ]);
  });

  it("suggests the only registered healthy backend", () => {
    const catalog = resolveAcpSetupCatalog({});
    expect(resolveSuggestedAcpBackendId(catalog)).toBe("acpx");
  });
});
