// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildCloudProviderDraftEntry,
  buildLocalProviderDraftEntry,
  resolveFirstAvailableCloudPresetId,
  resolveLocalModelProviderPreset,
} from "./config-form-provider-presets.ts";
import {
  getModelProviderCreateModalState,
  isModelProvidersMapPath,
  isValidModelProviderId,
  normalizeModelProviderDraftEntry,
  patchModelProviderCreateDraft,
  resolveModelProviderCreateModalErrorKey,
  resolveModelProviderDraftBaseUrl,
  resolveModelProviderDraftKey,
  setModelProviderCreateModalStateForTest,
} from "./config-form-provider-modal.ts";

describe("config-form-provider-modal", () => {
  it("detects models.providers map paths", () => {
    expect(isModelProvidersMapPath(["models", "providers"])).toBe(true);
    expect(isModelProvidersMapPath(["models"])).toBe(false);
  });

  it("validates provider ids", () => {
    expect(isValidModelProviderId("my-local-llm")).toBe(true);
    expect(isValidModelProviderId("")).toBe(false);
    expect(isValidModelProviderId("bad id")).toBe(false);
    expect(isValidModelProviderId("-bad")).toBe(false);
  });

  it("uses a stable draft key before the provider id is set", () => {
    expect(resolveModelProviderDraftKey("")).toBe("__draft__");
    expect(resolveModelProviderDraftKey("my-local-llm")).toBe("my-local-llm");
  });

  it("normalizes draft entries with a models array", () => {
    expect(normalizeModelProviderDraftEntry({ baseUrl: "https://llm.example.com/v1" })).toEqual({
      baseUrl: "https://llm.example.com/v1",
      models: [],
    });
  });

  it("patches nested draft provider fields", () => {
    const state = getModelProviderCreateModalState();
    state.draftEntry = { models: [] };
    patchModelProviderCreateDraft(
      "my-local-llm",
      ["models", "providers"],
      ["models", "providers", "my-local-llm", "api"],
      "openai-completions",
    );
    patchModelProviderCreateDraft(
      "my-local-llm",
      ["models", "providers"],
      ["models", "providers", "my-local-llm", "baseUrl"],
      "https://llm.example.com/v1",
    );
    expect(state.draftEntry).toEqual({
      api: "openai-completions",
      baseUrl: "https://llm.example.com/v1",
      models: [],
    });
    expect(
      resolveModelProviderCreateModalErrorKey(
        "custom",
        "my-local-llm",
        "",
        "",
        state.draftEntry,
        {},
      ),
    ).toBeNull();
    expect(resolveModelProviderDraftBaseUrl({ baseUrl: " https://x " })).toBe("https://x");
  });

  it("reports validation errors for incomplete drafts", () => {
    expect(
      resolveModelProviderCreateModalErrorKey("custom", "my-local-llm", "", "", { models: [] }, {}),
    ).toBe("baseUrlRequired");
    expect(
      resolveModelProviderCreateModalErrorKey(
        "custom",
        "",
        "",
        "",
        { baseUrl: "https://llm.example.com/v1" },
        {},
      ),
    ).toBe("providerIdRequired");
    expect(
      resolveModelProviderCreateModalErrorKey(
        "custom",
        "openai",
        "",
        "",
        { baseUrl: "https://llm.example.com/v1", models: [] },
        { openai: {} },
      ),
    ).toBe("providerIdExists");
  });

  it("allows cloud overlays without baseUrl", () => {
    expect(
      resolveModelProviderCreateModalErrorKey(
        "cloud",
        "anthropic",
        "anthropic",
        "",
        { apiKey: "sk-test" },
        {},
      ),
    ).toBeNull();
    expect(buildCloudProviderDraftEntry({ apiKey: " sk-test " })).toEqual({ apiKey: "sk-test" });
  });

  it("requires model id for local quick add", () => {
    const preset = resolveLocalModelProviderPreset("ollama");
    expect(preset).toBeDefined();
    expect(
      resolveModelProviderCreateModalErrorKey(
        "local",
        "ollama",
        "ollama",
        "",
        { baseUrl: "http://127.0.0.1:11434", models: [] },
        {},
      ),
    ).toBe("modelIdRequired");
    expect(
      buildLocalProviderDraftEntry(
        preset!,
        { baseUrl: "http://127.0.0.1:11434" },
        "llama3.3",
      ),
    ).toEqual({
      baseUrl: "http://127.0.0.1:11434",
      models: [{ id: "llama3.3", name: "llama3.3" }],
    });
  });

  it("skips baseUrl validation for built-in custom overlays", () => {
    expect(
      resolveModelProviderCreateModalErrorKey(
        "custom",
        "openai",
        "",
        "",
        { apiKey: "sk-test" },
        {},
      ),
    ).toBeNull();
  });

  it("picks the first available cloud preset", () => {
    expect(resolveFirstAvailableCloudPresetId({ openai: {}, anthropic: {} })).toBe("google");
    setModelProviderCreateModalStateForTest({ kind: "cloud", presetId: "google", providerId: "google" });
    expect(getModelProviderCreateModalState().providerId).toBe("google");
  });
});
