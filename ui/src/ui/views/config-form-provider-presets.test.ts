// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  inferModelProviderKind,
  resolveFirstModelIdFromProviderEntry,
  seedProviderEditDraft,
} from "./config-form-provider-presets.ts";

describe("config-form-provider-presets kind inference", () => {
  it("infers cloud for built-in cloud providers", () => {
    expect(inferModelProviderKind("deepseek", {})).toBe("cloud");
    expect(inferModelProviderKind("deepseek", { apiKey: "sk-test" })).toBe("cloud");
  });

  it("infers local for built-in local providers", () => {
    expect(inferModelProviderKind("ollama", { baseUrl: "http://127.0.0.1:11434", models: [] })).toBe(
      "local",
    );
  });

  it("infers custom for unknown providers with baseUrl", () => {
    expect(
      inferModelProviderKind("my-remote", {
        baseUrl: "https://llm.example.com/v1",
        models: [{ id: "foo", name: "foo" }],
      }),
    ).toBe("custom");
  });

  it("seeds local edit drafts with first model id", () => {
    const seeded = seedProviderEditDraft("ollama", {
      baseUrl: "http://127.0.0.1:11434",
      models: [{ id: "llama3.3", name: "llama3.3" }],
    });
    expect(seeded.kind).toBe("local");
    expect(seeded.quickModelId).toBe("llama3.3");
    expect(resolveFirstModelIdFromProviderEntry(seeded.draftEntry)).toBe("llama3.3");
  });
});
