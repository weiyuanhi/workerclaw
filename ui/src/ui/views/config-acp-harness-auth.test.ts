import { describe, expect, it } from "vitest";
import {
  canStartHarnessBrowserLogin,
  resolveHarnessAuthEntry,
  shouldShowHarnessAuthSections,
} from "./config-acp-harness-auth.ts";
import { resolveAcpHarnessAuthSpec } from "../../../../src/shared/acp-harness-auth-spec.ts";

describe("config acp harness auth section", () => {
  it("shows when relevant harnesses are selected", () => {
    expect(
      shouldShowHarnessAuthSections({
        acpEnabled: true,
        defaultAgent: "cursor",
      }),
    ).toBe(true);
  });

  it("hides when ACP is disabled", () => {
    expect(
      shouldShowHarnessAuthSections({
        acpEnabled: false,
        defaultAgent: "cursor",
      }),
    ).toBe(false);
  });

  it("resolves harness auth entries from catalog", () => {
    const entry = resolveHarnessAuthEntry(
      {
        backends: [],
        harnessIds: ["cursor", "claude"],
        harnessAuth: [
          { harnessId: "claude", state: "logged_in" },
          { harnessId: "cursor", state: "logged_out" },
        ],
      },
      "claude",
    );

    expect(entry?.state).toBe("logged_in");
  });

  it("blocks browser login when api key auth is active", () => {
    const spec = resolveAcpHarnessAuthSpec("cursor");
    expect(spec).toBeDefined();
    expect(
      canStartHarnessBrowserLogin(spec!, {
        harnessId: "cursor",
        state: "api_key",
      }),
    ).toBe(false);
  });
});
