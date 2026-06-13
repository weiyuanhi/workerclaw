// Derives human-readable session titles from transcript text and metadata.
import { findCodeRegions } from "../shared/text/code-regions.js";

const CODE_START_RE =
  /^\s*(import\s+|export\s+|const\s+|let\s+|var\s+|function\s+|class\s+|interface\s+|type\s+|#include|#!\/|<?php|<\?xml|<!DOCTYPE|\{|\[|\(|\/\/|\/\*|SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+|def\s+|async\s+|await\s+|package\s+|using\s+|public\s+|private\s+)/i;

/** Removes fenced and inline code so prose can be used as a session title. */
export function stripCodeFromMessageForTitle(text: string): string {
  const regions = findCodeRegions(text);
  if (regions.length === 0) {
    return text.replace(/`+[^`\n]+`+/g, " ").replace(/\s+/g, " ").trim();
  }

  let stripped = "";
  let cursor = 0;
  for (const region of regions) {
    if (region.start > cursor) {
      stripped += `${text.slice(cursor, region.start)} `;
    }
    cursor = region.end;
  }
  if (cursor < text.length) {
    stripped += text.slice(cursor);
  }
  return stripped.replace(/\s+/g, " ").trim();
}

/** Returns true when text is too technical to use as a session title. */
export function isPoorSessionTitle(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) {
    return true;
  }

  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  if (/^[0-9a-f]{8,}$/i.test(trimmed) && !/\s/u.test(trimmed)) {
    return true;
  }
  if (!/\s/u.test(trimmed) && trimmed.length > 40) {
    return true;
  }
  if (CODE_START_RE.test(trimmed)) {
    return true;
  }

  const letters = (trimmed.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const spaces = (trimmed.match(/\s/gu) ?? []).length;
  const symbols = trimmed.length - letters - spaces;
  if (trimmed.length >= 12 && symbols / trimmed.length > 0.25) {
    return true;
  }

  const lines = trimmed.split("\n");
  if (lines.length >= 2) {
    const codeLines = lines.filter(
      (line) => /^\s{2,}[\w({[<]/.test(line) || /[;}]\s*$/.test(line.trim()),
    ).length;
    if (codeLines / lines.length >= 0.6) {
      return true;
    }
  }

  return false;
}

function firstReadableSentence(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  return firstLine.match(/^[^.!?。！？]+[.!?。！？]?/u)?.[0]?.trim() ?? firstLine;
}

/** Picks the best short natural-language title from a user message, if any. */
export function extractTitleCandidateFromMessage(text: string): string | null {
  const stripped = stripCodeFromMessageForTitle(text);
  if (!stripped) {
    return null;
  }

  const sentence = firstReadableSentence(stripped);
  if (!isPoorSessionTitle(sentence)) {
    return sentence;
  }
  if (stripped !== sentence && !isPoorSessionTitle(stripped)) {
    return stripped;
  }
  return null;
}
