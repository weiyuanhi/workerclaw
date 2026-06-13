// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildModelProviderRemovalFormPatches,
  collectChatVisibleProviderIds,
  modelAllowlistKeyMatchesProvider,
  removeProviderFromAllowlistModels,
} from "./config-form-provider-sync.ts";

describe("config-form-provider-sync", () => {
  it("collects unique provider ids from chat catalog", () => {
    expect(
      collectChatVisibleProviderIds([
        { id: "gpt-5.5", name: "GPT-5.5", provider: "openai" },
        { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
        { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
      ]),
    ).toEqual(["deepseek", "openai"]);
  });

  it("matches allowlist keys for a provider", () => {
    expect(modelAllowlistKeyMatchesProvider("deepseek/deepseek-chat", "deepseek")).toBe(true);
    expect(modelAllowlistKeyMatchesProvider("deepseek/*", "deepseek")).toBe(true);
    expect(modelAllowlistKeyMatchesProvider("openai/gpt-5.5", "deepseek")).toBe(false);
  });

  it("removes provider entries from allowlist", () => {
    expect(
      removeProviderFromAllowlistModels(
        {
          "deepseek/*": {},
          "openai/gpt-5.5": { alias: "GPT" },
        },
        "deepseek",
      ),
    ).toEqual({
      "openai/gpt-5.5": { alias: "GPT" },
    });
  });

  it("builds form patches for provider removal", () => {
    const patches = buildModelProviderRemovalFormPatches(
      {
        models: {
          providers: {
            deepseek: { apiKey: "sk-test" },
            openai: { apiKey: "sk-openai" },
          },
        },
        agents: {
          defaults: {
            models: {
              "deepseek/*": {},
              "openai/gpt-5.5": {},
            },
          },
        },
      },
      "deepseek",
    );
    expect(patches).toEqual([
      {
        path: ["models", "providers"],
        value: { openai: { apiKey: "sk-openai" } },
      },
      {
        path: ["agents", "defaults", "models"],
        value: { "openai/gpt-5.5": {} },
      },
    ]);
  });
});
