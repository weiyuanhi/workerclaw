import { describe, expect, it } from "vitest";
import {
  resolveMemoryBackend,
  resolveQmdSearchMode,
  shouldShowMemoryField,
} from "./config-memory.ts";

describe("config memory visibility", () => {
  it("defaults to builtin backend", () => {
    expect(resolveMemoryBackend(undefined)).toBe("builtin");
    expect(resolveMemoryBackend({})).toBe("builtin");
    expect(resolveMemoryBackend({ backend: "builtin" })).toBe("builtin");
  });

  it("hides qmd fields when builtin is selected", () => {
    expect(shouldShowMemoryField("memory.backend", { backend: "builtin" })).toBe(true);
    expect(shouldShowMemoryField("memory.citations", { backend: "builtin" })).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.command", { backend: "builtin" })).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.searchMode", { backend: "builtin" })).toBe(false);
  });

  it("shows qmd core fields when qmd backend is selected", () => {
    const memory = { backend: "qmd", qmd: { searchMode: "search" } };
    expect(shouldShowMemoryField("memory.qmd.command", memory)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.paths", memory)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.rerank", memory)).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.update.embedInterval", memory)).toBe(false);
  });

  it("shows rerank only for query search mode", () => {
    const memory = { backend: "qmd", qmd: { searchMode: "query" } };
    expect(shouldShowMemoryField("memory.qmd.rerank", memory)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.update.embedInterval", memory)).toBe(true);
  });

  it("shows mcporter detail fields only when enabled", () => {
    const disabled = {
      backend: "qmd",
      qmd: { mcporter: { enabled: false } },
    };
    const enabled = {
      backend: "qmd",
      qmd: { mcporter: { enabled: true } },
    };
    expect(shouldShowMemoryField("memory.qmd.mcporter.enabled", disabled)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.mcporter.serverName", disabled)).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.searchTool", disabled)).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.mcporter.serverName", enabled)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.searchTool", enabled)).toBe(true);
  });

  it("shows session export fields only when session indexing is enabled", () => {
    const off = { backend: "qmd", qmd: { sessions: { enabled: false } } };
    const on = { backend: "qmd", qmd: { sessions: { enabled: true } } };
    expect(shouldShowMemoryField("memory.qmd.sessions.enabled", off)).toBe(true);
    expect(shouldShowMemoryField("memory.qmd.sessions.exportDir", off)).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.sessions.exportDir", on)).toBe(true);
  });

  it("shows startup delay only for idle startup refresh", () => {
    const off = { backend: "qmd", qmd: { update: { startup: "off" } } };
    const idle = { backend: "qmd", qmd: { update: { startup: "idle" } } };
    expect(shouldShowMemoryField("memory.qmd.update.startupDelayMs", off)).toBe(false);
    expect(shouldShowMemoryField("memory.qmd.update.startupDelayMs", idle)).toBe(true);
  });

  it("resolves qmd search mode with search default", () => {
    expect(resolveQmdSearchMode({ backend: "qmd" })).toBe("search");
    expect(resolveQmdSearchMode({ backend: "qmd", qmd: { searchMode: "vsearch" } })).toBe(
      "vsearch",
    );
  });
});
