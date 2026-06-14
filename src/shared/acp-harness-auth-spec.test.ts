import { describe, expect, it } from "vitest";
import { resolveRelevantAcpHarnessAuthSpecs } from "./acp-harness-auth-spec.ts";

describe("acp harness auth spec", () => {
  it("returns specs for selected default and allowed harnesses", () => {
    const specs = resolveRelevantAcpHarnessAuthSpecs({
      acpEnabled: true,
      defaultAgent: "cursor",
      allowedAgents: ["claude", "codex"],
    });
    expect(specs.map((spec) => spec.harnessId)).toEqual(["claude", "codex", "cursor"]);
  });

  it("hides specs when ACP is disabled", () => {
    expect(
      resolveRelevantAcpHarnessAuthSpecs({
        acpEnabled: false,
        defaultAgent: "cursor",
      }),
    ).toEqual([]);
  });
});
