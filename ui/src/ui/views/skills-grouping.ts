// Control UI view renders skills grouping screen content.
import { t } from "../../i18n/index.ts";
import type { SkillStatusEntry } from "../types.ts";

export type SkillGroup = {
  id: string;
  label: string;
  skills: SkillStatusEntry[];
};

export const DEFAULT_PLAYBOOKS_SUBDIR = "playbooks";

const SKILL_SOURCE_GROUPS: Array<{ id: string; label: string; sources: string[] }> = [
  { id: "workspace", label: "Workspace Skills", sources: ["openclaw-workspace"] },
  { id: "workspace-playbooks", label: "Workspace Playbooks", sources: ["openclaw-workspace"] },
  { id: "built-in", label: "Built-in Skills", sources: ["openclaw-bundled"] },
  { id: "installed", label: "Installed Skills", sources: ["openclaw-managed"] },
  { id: "extra", label: "Extra Skills", sources: ["openclaw-extra"] },
];

function normalizePathForMatch(value: string): string {
  return value.replace(/\\/g, "/");
}

/** Reads the configured playbooks subdirectory from gateway config. */
export function resolvePlaybooksSubdirFromConfig(
  config?: Record<string, unknown> | null,
): string {
  const skills = config?.skills;
  if (!skills || typeof skills !== "object") {
    return DEFAULT_PLAYBOOKS_SUBDIR;
  }
  const workshop = (skills as Record<string, unknown>).workshop;
  if (!workshop || typeof workshop !== "object") {
    return DEFAULT_PLAYBOOKS_SUBDIR;
  }
  const playbooks = (workshop as Record<string, unknown>).playbooks;
  if (!playbooks || typeof playbooks !== "object") {
    return DEFAULT_PLAYBOOKS_SUBDIR;
  }
  const subdir = (playbooks as Record<string, unknown>).subdir;
  if (typeof subdir === "string" && subdir.trim()) {
    return subdir.trim();
  }
  return DEFAULT_PLAYBOOKS_SUBDIR;
}

/** True when a workspace skill lives under skills/<playbooksSubdir>/. */
export function isWorkspacePlaybook(
  skill: SkillStatusEntry,
  playbooksSubdir = DEFAULT_PLAYBOOKS_SUBDIR,
): boolean {
  if (skill.source !== "openclaw-workspace") {
    return false;
  }
  const subdir = playbooksSubdir.trim() || DEFAULT_PLAYBOOKS_SUBDIR;
  const marker = `/skills/${subdir}/`;
  const paths = [skill.baseDir, skill.filePath].map(normalizePathForMatch);
  return paths.some((entry) => entry.includes(marker));
}

export function groupSkills(
  skills: SkillStatusEntry[],
  options?: { playbooksSubdir?: string },
): SkillGroup[] {
  const playbooksSubdir = options?.playbooksSubdir?.trim() || DEFAULT_PLAYBOOKS_SUBDIR;
  const groups = new Map<string, SkillGroup>();
  for (const def of SKILL_SOURCE_GROUPS) {
    groups.set(def.id, { id: def.id, label: def.label, skills: [] });
  }
  const builtInGroup = SKILL_SOURCE_GROUPS.find((group) => group.id === "built-in");
  const other: SkillGroup = { id: "other", label: "Other Skills", skills: [] };
  for (const skill of skills) {
    if (skill.bundled) {
      builtInGroup && groups.get(builtInGroup.id)?.skills.push(skill);
      continue;
    }
    if (skill.source === "openclaw-workspace") {
      const groupId = isWorkspacePlaybook(skill, playbooksSubdir)
        ? "workspace-playbooks"
        : "workspace";
      groups.get(groupId)?.skills.push(skill);
      continue;
    }
    const match = SKILL_SOURCE_GROUPS.find((group) => group.sources.includes(skill.source));
    if (match && match.id !== "workspace" && match.id !== "workspace-playbooks") {
      groups.get(match.id)?.skills.push(skill);
    } else {
      other.skills.push(skill);
    }
  }
  const ordered = SKILL_SOURCE_GROUPS.map((group) => groups.get(group.id)).filter(
    (group): group is SkillGroup => Boolean(group && group.skills.length > 0),
  );
  if (other.skills.length > 0) {
    ordered.push(other);
  }
  return ordered;
}

export function resolveSkillGroupLabel(group: SkillGroup): string {
  const keyById: Record<string, string> = {
    workspace: "agents.skillsPanel.groups.workspace",
    "workspace-playbooks": "agents.skillsPanel.groups.workspacePlaybooks",
    "built-in": "agents.skillsPanel.groups.builtIn",
    installed: "agents.skillsPanel.groups.installed",
    extra: "agents.skillsPanel.groups.extra",
    other: "agents.skillsPanel.groups.other",
  };
  const key = keyById[group.id];
  return key ? t(key) : group.label;
}
