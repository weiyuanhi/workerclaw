// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildModelProviderListRows } from "./config-form-providers-map.ts";

describe("config-form-providers-map", () => {
  it("lists chat-visible providers from catalog even without models.providers entries", () => {
    const rows = buildModelProviderListRows({
      configured: {
        openai: { apiKey: "sk-test" },
      },
      authProviders: [
        {
          provider: "deepseek",
          displayName: "DeepSeek",
          status: "ok",
          profiles: [],
        },
      ],
      modelCatalog: [
        { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
        { id: "gpt-5.5", name: "GPT-5.5", provider: "openai" },
      ],
    });
    expect(rows.map((row) => row.id)).toEqual(["deepseek", "openai"]);
    expect(rows.find((row) => row.id === "deepseek")?.displayName).toBe("DeepSeek");
    expect(rows.find((row) => row.id === "deepseek")?.kind).toBe("cloud");
  });

  it("falls back to configured models.providers keys when catalog is empty", () => {
    const rows = buildModelProviderListRows({
      configured: {
        openai: { apiKey: "sk-test" },
        "my-local-llm": { baseUrl: "https://llm.example.com/v1", models: [] },
      },
      modelCatalog: [],
    });
    expect(rows.map((row) => row.id)).toEqual(["my-local-llm", "openai"]);
  });
});
