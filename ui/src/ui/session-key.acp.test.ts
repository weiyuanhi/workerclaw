import { describe, expect, it } from "vitest";
import {
  isAcpSessionKey,
  resolveAgentIdFromSessionKey,
  resolveUiGatewayAgentIdFromSessionKey,
} from "./session-key.ts";

describe("ACP session key helpers", () => {
  it("detects ACP session keys", () => {
    expect(isAcpSessionKey("agent:cursor:acp:069a8bf4-027b-4e45-9c60-4c4ff527c227")).toBe(true);
    expect(isAcpSessionKey("agent:main:main")).toBe(false);
  });

  it("maps ACP session keys to the configured OpenClaw agent id for gateway RPCs", () => {
    const sessionKey = "agent:cursor:acp:069a8bf4-027b-4e45-9c60-4c4ff527c227";
    expect(resolveUiGatewayAgentIdFromSessionKey(sessionKey, "main")).toBe("main");
    expect(resolveAgentIdFromSessionKey(sessionKey)).toBe("main");
  });

  it("keeps normal agent session keys unchanged", () => {
    expect(resolveAgentIdFromSessionKey("agent:main:openclaw-weixin:direct:peer")).toBe("main");
  });
});
