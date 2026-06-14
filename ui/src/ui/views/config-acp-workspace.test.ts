import { describe, expect, it, vi } from "vitest";
import {
  patchDefaultAgentAcpCwd,
  resolveAcpConfigDefaultAgentId,
  resolveAcpWorkspaceTarget,
  resolveEffectiveAcpRuntimeCwd,
} from "./config-acp-workspace.ts";

describe("acp workspace config", () => {
  it("resolves default agent id from config list", () => {
    expect(
      resolveAcpConfigDefaultAgentId({
        agents: {
          list: [
            { id: "ops" },
            { id: "main", default: true, workspace: "/repo" },
          ],
        },
      }),
    ).toBe("main");
  });

  it("inherits agent workspace when ACP cwd is unset", () => {
    const target = resolveAcpWorkspaceTarget(
      {
        agents: {
          defaults: { workspace: "/defaults" },
          list: [{ id: "main", default: true, workspace: "/agent" }],
        },
      },
      "main",
    );
    expect(target).toMatchObject({
      agentWorkspace: "/agent",
      workspaceSource: "agent",
      acpCwd: "",
    });
    expect(resolveEffectiveAcpRuntimeCwd(target)).toBe("/agent");
  });

  it("prefers configured ACP cwd over agent workspace", () => {
    const target = resolveAcpWorkspaceTarget(
      {
        agents: {
          list: [
            {
              id: "main",
              default: true,
              workspace: "/agent",
              runtime: { type: "acp", acp: { cwd: "/acp-only" } },
            },
          ],
        },
      },
      "main",
    );
    expect(resolveEffectiveAcpRuntimeCwd(target)).toBe("/acp-only");
  });

  it("creates a list entry when setting ACP cwd for a missing agent", () => {
    const onPatch = vi.fn();
    patchDefaultAgentAcpCwd(
      {
        value: { agents: { defaults: {} } },
        onPatch,
      },
      {
        agentId: "main",
        listIndex: -1,
        agentWorkspace: "",
        workspaceSource: "none",
        acpCwd: "",
      },
      "/tmp/acp",
    );
    expect(onPatch).toHaveBeenCalledWith(["agents", "list", 0, "id"], "main");
    expect(onPatch).toHaveBeenCalledWith(["agents", "list", 0, "runtime", "type"], "acp");
    expect(onPatch).toHaveBeenCalledWith(["agents", "list", 0, "runtime", "acp", "cwd"], "/tmp/acp");
  });
});
