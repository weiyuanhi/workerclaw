// Playbook helpers tests cover target resolution and proposal body rendering.
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYBOOKS_SUBDIR,
  normalizePlaybooksSubdir,
  renderPlaybookProposalBody,
  resolvePlaybooksWorkshopConfig,
  resolveSkillProposalCategory,
} from "./playbooks.js";
import { resolveCreateSkillProposalTarget } from "./store.js";

describe("playbooks workshop helpers", () => {
  it("normalizes unsafe subdir names to the default", () => {
    expect(normalizePlaybooksSubdir("playbooks")).toBe("playbooks");
    expect(normalizePlaybooksSubdir("../escape")).toBe(DEFAULT_PLAYBOOKS_SUBDIR);
    expect(normalizePlaybooksSubdir("")).toBe(DEFAULT_PLAYBOOKS_SUBDIR);
  });

  it("resolves playbook category when enabled", () => {
    expect(
      resolveSkillProposalCategory({
        category: "playbook",
        config: { skills: { workshop: { playbooks: { enabled: true } } } },
      }),
    ).toBe("playbook");
    expect(
      resolveSkillProposalCategory({
        category: "playbook",
        config: { skills: { workshop: { playbooks: { enabled: false } } } },
      }),
    ).toBe("skill");
  });

  it("targets skills/playbooks/<name> for playbook creates", () => {
    const workspaceDir = "/tmp/workspace";
    const target = resolveCreateSkillProposalTarget({
      workspaceDir,
      skillName: "fill-purchase-order",
      category: "playbook",
    });
    expect(target.category).toBe("playbook");
    expect(target.skillFile).toBe(
      path.join(workspaceDir, "skills", "playbooks", "fill-purchase-order", "SKILL.md"),
    );
  });

  it("renders structured playbook bodies", () => {
    const body = renderPlaybookProposalBody({
      title: "Fill Purchase Order",
      summary: "Portal workflow for PO submission.",
      steps: ["Open vendor portal", "Submit PO form"],
      pitfalls: ["Confirm cost center before submit"],
    });
    expect(body).toContain("# Fill Purchase Order");
    expect(body).toContain("Open vendor portal");
    expect(body).toContain("Confirm cost center before submit");
  });

  it("reads playbooks config defaults", () => {
    expect(resolvePlaybooksWorkshopConfig(undefined)).toEqual({
      enabled: true,
      subdir: "playbooks",
    });
  });
});
