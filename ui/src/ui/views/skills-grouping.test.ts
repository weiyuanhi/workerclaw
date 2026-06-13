import { describe, expect, it } from "vitest";
import type { SkillStatusEntry } from "../types.ts";
import {
  DEFAULT_PLAYBOOKS_SUBDIR,
  groupSkills,
  isWorkspacePlaybook,
  resolvePlaybooksSubdirFromConfig,
} from "./skills-grouping.ts";

function createSkill(overrides: Partial<SkillStatusEntry> = {}): SkillStatusEntry {
  return {
    name: "example-skill",
    description: "Example skill",
    source: "openclaw-workspace",
    filePath: "/tmp/workspace/skills/example-skill/SKILL.md",
    baseDir: "/tmp/workspace/skills/example-skill",
    skillKey: "example-skill",
    bundled: false,
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: true,
    requirements: { bins: [], env: [], config: [], os: [] },
    missing: { bins: [], env: [], config: [], os: [] },
    configChecks: [],
    install: [],
    ...overrides,
  };
}

describe("skills grouping", () => {
  it("detects workspace playbooks by configured subdir", () => {
    const playbook = createSkill({
      name: "fill-purchase-order",
      skillKey: "fill-purchase-order",
      baseDir: "/tmp/workspace/skills/playbooks/fill-purchase-order",
      filePath: "/tmp/workspace/skills/playbooks/fill-purchase-order/SKILL.md",
    });
    expect(isWorkspacePlaybook(playbook)).toBe(true);
    expect(isWorkspacePlaybook(playbook, "runbooks")).toBe(false);
  });

  it("reads playbooks subdir from gateway config", () => {
    expect(resolvePlaybooksSubdirFromConfig(null)).toBe(DEFAULT_PLAYBOOKS_SUBDIR);
    expect(
      resolvePlaybooksSubdirFromConfig({
        skills: { workshop: { playbooks: { subdir: "runbooks" } } },
      }),
    ).toBe("runbooks");
  });

  it("splits workspace skills and playbooks into separate groups", () => {
    const workspaceSkill = createSkill({ name: "hello-world", skillKey: "hello-world" });
    const playbook = createSkill({
      name: "fill-purchase-order",
      skillKey: "fill-purchase-order",
      baseDir: "/tmp/workspace/skills/playbooks/fill-purchase-order",
      filePath: "/tmp/workspace/skills/playbooks/fill-purchase-order/SKILL.md",
    });
    const bundled = createSkill({
      name: "bundled-skill",
      skillKey: "bundled-skill",
      source: "openclaw-bundled",
      bundled: true,
    });

    const groups = groupSkills([workspaceSkill, playbook, bundled]);
    expect(groups.map((group) => group.id)).toEqual([
      "workspace",
      "workspace-playbooks",
      "built-in",
    ]);
    expect(groups[0]?.skills.map((skill) => skill.name)).toEqual(["hello-world"]);
    expect(groups[1]?.skills.map((skill) => skill.name)).toEqual(["fill-purchase-order"]);
    expect(groups[2]?.skills.map((skill) => skill.name)).toEqual(["bundled-skill"]);
  });

  it("uses custom playbooks subdir when grouping", () => {
    const playbook = createSkill({
      name: "vendor-onboarding",
      skillKey: "vendor-onboarding",
      baseDir: "/tmp/workspace/skills/runbooks/vendor-onboarding",
      filePath: "/tmp/workspace/skills/runbooks/vendor-onboarding/SKILL.md",
    });

    const defaultGroups = groupSkills([playbook]);
    expect(defaultGroups.map((group) => group.id)).toEqual(["workspace"]);

    const customGroups = groupSkills([playbook], { playbooksSubdir: "runbooks" });
    expect(customGroups.map((group) => group.id)).toEqual(["workspace-playbooks"]);
  });
});
