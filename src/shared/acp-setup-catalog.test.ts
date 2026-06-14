/** Browser-safe ACP setup catalog tests. */
import { describe, expect, it } from "vitest";
import {
  mergeAcpCatalogEntries,
  mergeAcpHarnessIds,
  resolveAcpxCustomHarnessIds,
  resolveAcpSetupCatalog,
} from "./acp-setup-catalog.ts";

describe("shared acp setup catalog", () => {
  it("merges remote and local harness catalogs", () => {
    const merged = mergeAcpCatalogEntries({
      remote: {
        backends: [{ id: "acpx", registered: true, healthy: true }],
        harnessIds: ["cursor"],
      },
      cfg: {
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
    });
    expect(merged.harnessIds).toContain("cursor");
    expect(merged.harnessIds).toContain("my-tool");
  });

  it("reads custom harness ids from acpx plugin config", () => {
    expect(
      resolveAcpxCustomHarnessIds({
        plugins: { entries: { acpx: { config: { agents: { cursor: {} } } } } },
      }),
    ).toEqual(["cursor"]);
  });

  it("includes built-in harness ids by default", () => {
    expect(resolveAcpSetupCatalog({}).harnessIds).toContain("codex");
    expect(mergeAcpHarnessIds({})).toContain("cursor");
  });
});
