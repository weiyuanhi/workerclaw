// Playbook helpers route learned business workflows into workspace skills/playbooks/.
import { asNullableRecord } from "@openclaw/normalization-core/record-coerce";
import type { OpenClawConfig } from "../../config/types.openclaw.js";

/** Default workspace subdirectory for learned business playbooks. */
export const DEFAULT_PLAYBOOKS_SUBDIR = "playbooks";

/** Skill Workshop proposal category for general vs playbook targets. */
export type SkillProposalCategory = "skill" | "playbook";

export type PlaybooksWorkshopConfig = {
  enabled: boolean;
  subdir: string;
};

const DEFAULT_PLAYBOOKS_CONFIG: PlaybooksWorkshopConfig = {
  enabled: true,
  subdir: DEFAULT_PLAYBOOKS_SUBDIR,
};

const SUBDIR_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/** Normalizes the playbooks subdirectory name to a single safe path segment. */
export function normalizePlaybooksSubdir(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || !SUBDIR_PATTERN.test(trimmed)) {
    return DEFAULT_PLAYBOOKS_SUBDIR;
  }
  return trimmed;
}

export function resolvePlaybooksWorkshopConfig(config?: OpenClawConfig): PlaybooksWorkshopConfig {
  const raw = asNullableRecord(config?.skills?.workshop) ?? {};
  const playbooks = asNullableRecord(raw.playbooks) ?? {};
  const enabled =
    typeof playbooks.enabled === "boolean" ? playbooks.enabled : DEFAULT_PLAYBOOKS_CONFIG.enabled;
  return {
    enabled,
    subdir: normalizePlaybooksSubdir(
      typeof playbooks.subdir === "string" ? playbooks.subdir : undefined,
    ),
  };
}

/** Resolves the effective proposal category, honoring playbooks enablement. */
export function resolveSkillProposalCategory(params: {
  category?: SkillProposalCategory;
  config?: OpenClawConfig;
}): SkillProposalCategory {
  const requested = params.category === "playbook" ? "playbook" : "skill";
  if (requested === "playbook") {
    const playbooks = resolvePlaybooksWorkshopConfig(params.config);
    return playbooks.enabled ? "playbook" : "skill";
  }
  return "skill";
}

/** Renders a playbook SKILL.md body from structured workflow notes. */
export function renderPlaybookProposalBody(params: {
  title: string;
  summary: string;
  steps: string[];
  pitfalls?: string[];
  evidence?: string;
}): string {
  const steps = params.steps.map((step) => `- ${step.trim()}`).filter((line) => line.length > 2);
  const pitfalls = (params.pitfalls ?? [])
    .map((item) => `- ${item.trim()}`)
    .filter((line) => line.length > 2);
  const lines = [
    `# ${params.title.trim()}`,
    "",
    "## Purpose",
    "",
    params.summary.trim(),
    "",
    "## Workflow",
    "",
    ...(steps.length > 0 ? steps : ["- Capture the ordered steps from the successful run."]),
    "",
    "## Verification",
    "",
    "- Confirm the business outcome before final reply.",
    "- Capture screenshots or IDs when the workflow depends on external systems.",
  ];
  if (pitfalls.length > 0) {
    lines.push("", "## Pitfalls", "", ...pitfalls);
  }
  if (params.evidence?.trim()) {
    lines.push("", "## Source", "", params.evidence.trim());
  }
  lines.push(
    "",
    "## Maintenance",
    "",
    "- Update through `skill_workshop` with `action=update` after the user approves changes.",
    "- Keep facts in `MEMORY.md`; keep procedural detail here.",
    "",
  );
  return lines.join("\n");
}

/** Short README seeded into new workspaces under skills/playbooks/. */
export const WORKSPACE_PLAYBOOKS_README = `# Playbooks

Learned business workflows live here as workspace skills.

- Each playbook is a folder with \`SKILL.md\`.
- Creation and updates go through Skill Workshop (\`skill_workshop\`) as pending proposals.
- Apply only after the user explicitly approves a proposal.
- Facts and preferences belong in \`MEMORY.md\`; multi-step procedures belong here.
`;
