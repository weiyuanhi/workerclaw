import { describe, expect, it } from "vitest";
import {
  ACP_ADVANCED_TOP_LEVEL_KEYS,
  ACP_BASIC_FIELD_KEYS,
  ACP_DISPATCH_FIELD_KEYS,
  ACP_RUNTIME_FIELD_KEYS,
  ACP_STREAM_FIELD_KEYS,
  isAcpAdvancedPath,
} from "./config-acp.ts";

describe("config acp field layout", () => {
  it("classifies basic fields", () => {
    for (const key of ACP_BASIC_FIELD_KEYS) {
      expect(isAcpAdvancedPath(`acp.${key}`)).toBe(false);
    }
    for (const key of ACP_DISPATCH_FIELD_KEYS) {
      expect(isAcpAdvancedPath(`acp.dispatch.${key}`)).toBe(false);
    }
  });

  it("classifies advanced fields", () => {
    for (const key of ACP_ADVANCED_TOP_LEVEL_KEYS) {
      expect(isAcpAdvancedPath(`acp.${key}`)).toBe(true);
    }
    for (const key of ACP_STREAM_FIELD_KEYS) {
      expect(isAcpAdvancedPath(`acp.stream.${key}`)).toBe(true);
    }
    for (const key of ACP_RUNTIME_FIELD_KEYS) {
      expect(isAcpAdvancedPath(`acp.runtime.${key}`)).toBe(true);
    }
  });

  it("ignores non-acp paths", () => {
    expect(isAcpAdvancedPath("agents.defaults.workspace")).toBe(false);
    expect(isAcpAdvancedPath("acp")).toBe(false);
  });
});
