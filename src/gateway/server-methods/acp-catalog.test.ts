import { describe, expect, it, vi } from "vitest";
import { acpCatalogHandlers } from "./acp-catalog.js";

describe("acp.catalog handler", () => {
  it("returns backend and harness catalog entries", async () => {
    const respond = vi.fn();
    await acpCatalogHandlers["acp.catalog"]({
      params: {},
      respond,
      context: {
        getRuntimeConfig: () => ({}),
      },
    } as never);

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        backends: expect.arrayContaining([expect.objectContaining({ id: "acpx" })]),
        harnessIds: expect.arrayContaining(["cursor", "codex"]),
      }),
      undefined,
    );
  });
});
