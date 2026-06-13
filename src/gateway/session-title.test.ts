import { describe, expect, it } from "vitest";
import {
  extractTitleCandidateFromMessage,
  isPoorSessionTitle,
  stripCodeFromMessageForTitle,
} from "./session-title.js";

describe("stripCodeFromMessageForTitle", () => {
  it("removes fenced code blocks", () => {
    expect(
      stripCodeFromMessageForTitle("Fix this bug\n```ts\nconst x = 1;\n```\nThanks"),
    ).toBe("Fix this bug Thanks");
  });

  it("removes inline code", () => {
    expect(stripCodeFromMessageForTitle("Use `npm install` here")).toBe("Use here");
  });
});

describe("isPoorSessionTitle", () => {
  it("rejects code-like starters", () => {
    expect(isPoorSessionTitle("import fs from 'node:fs'")).toBe(true);
    expect(isPoorSessionTitle("function main() {")).toBe(true);
  });

  it("accepts natural language", () => {
    expect(isPoorSessionTitle("Help me refactor auth")).toBe(false);
  });
});

describe("extractTitleCandidateFromMessage", () => {
  it("uses prose before a fenced code block", () => {
    expect(
      extractTitleCandidateFromMessage(
        "Review this parser\n```python\nprint('hello')\n```",
      ),
    ).toBe("Review this parser");
  });

  it("skips code-only messages", () => {
    expect(extractTitleCandidateFromMessage("const answer = 42;")).toBeNull();
  });

  it("uses a later-friendly message when the first is code-only", () => {
    expect(extractTitleCandidateFromMessage("How do I deploy this?")).toBe("How do I deploy this?");
  });
});
