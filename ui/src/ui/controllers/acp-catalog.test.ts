import { describe, expect, it } from "vitest";
import {
  mergeAcpCatalogWithForm,
  resolveLocalAcpSetupCatalog,
} from "./acp-catalog.ts";

describe("acp catalog controller helpers", () => {
  it("builds a local catalog from form config", () => {
    const catalog = resolveLocalAcpSetupCatalog({
      plugins: {
        entries: {
          acpx: {
            config: {
              agents: {
                cursor: { command: "/usr/local/bin/agent", args: ["acp"] },
              },
            },
          },
        },
      },
    });
    expect(catalog.backends.some((entry) => entry.id === "acpx")).toBe(true);
    expect(catalog.harnessIds).toContain("cursor");
  });

  it("merges remote harness ids with local custom aliases", () => {
    const merged = mergeAcpCatalogWithForm(
      {
        backends: [{ id: "acpx", registered: true, healthy: true }],
        harnessIds: ["cursor", "codex"],
      },
      {
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
      },
    );
    expect(merged.harnessIds).toContain("my-tool");
    expect(merged.backends[0]).toEqual({ id: "acpx", registered: true, healthy: true });
  });

  it("keeps remote harness auth entries when merging catalog", () => {
    const merged = mergeAcpCatalogWithForm(
      {
        backends: [{ id: "acpx", registered: true, healthy: true }],
        harnessIds: ["cursor"],
        harnessAuth: [{ harnessId: "cursor", state: "logged_out" }],
      },
      {},
    );
    expect(merged.harnessAuth).toEqual([{ harnessId: "cursor", state: "logged_out" }]);
  });
});
