import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";

type LegacyConfigRule = {
  path: string[];
  message: string;
  match: (value: unknown) => boolean;
};

export const legacyConfigRules: LegacyConfigRule[] = [];

export function normalizeCompatibilityConfig({ cfg }: { cfg: OpenClawConfig }): {
  config: OpenClawConfig;
  changes: string[];
} {
  return { config: cfg, changes: [] };
}

export async function probeAppiumDoctorHealth(): Promise<{
  ok: boolean;
  message: string;
}> {
  const { probeAppiumEnvironment } = await import("./src/probe.js");
  const status = await probeAppiumEnvironment({
    serverUrl: "http://127.0.0.1:4723",
  });
  if (status.appium.installed && status.appium.drivers.length > 0) {
    return { ok: true, message: "Appium CLI and drivers are installed." };
  }
  return {
    ok: false,
    message:
      "Appium is not ready. Enable the appium plugin, allowlist its tools, then run `openclaw appium setup`.",
  };
}
