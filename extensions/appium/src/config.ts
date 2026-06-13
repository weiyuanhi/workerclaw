import type { Static } from "typebox";
import { Type } from "typebox";
import {
  optionalPositiveIntegerSchema,
  optionalStringEnum,
} from "openclaw/plugin-sdk/channel-actions";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

export const APPIUM_PLATFORM_VALUES = ["android", "ios"] as const;
export type AppiumPlatform = (typeof APPIUM_PLATFORM_VALUES)[number];

export const appiumPluginConfigSchema = Type.Object(
  {
    serverPort: optionalPositiveIntegerSchema(),
    serverUrl: Type.Optional(Type.String()),
    testWorkdir: Type.Optional(Type.String()),
    defaultPlatform: optionalStringEnum(APPIUM_PLATFORM_VALUES),
    appiumPath: Type.Optional(Type.String()),
    adbPath: Type.Optional(Type.String()),
    autoStartServer: Type.Optional(Type.Boolean()),
    runTimeoutSec: optionalPositiveIntegerSchema(),
    androidDriver: Type.Optional(Type.String()),
    iosDriver: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type AppiumPluginConfig = Static<typeof appiumPluginConfigSchema>;

export const DEFAULT_APPIUM_PORT = 4723;
export const DEFAULT_ANDROID_DRIVER = "uiautomator2";
export const DEFAULT_IOS_DRIVER = "xcuitest";
export const DEFAULT_RUN_TIMEOUT_SEC = 3600;
export const SERVER_READY_TIMEOUT_MS = 60_000;
export const SERVER_POLL_INTERVAL_MS = 500;

export type ResolvedAppiumConfig = {
  serverPort: number;
  serverUrl: string;
  testWorkdir?: string;
  defaultPlatform: AppiumPlatform;
  appiumPath?: string;
  adbPath?: string;
  autoStartServer: boolean;
  runTimeoutSec: number;
  androidDriver: string;
  iosDriver: string;
};

export function resolveAppiumConfig(
  api: Pick<OpenClawPluginApi, "pluginConfig" | "config">,
): ResolvedAppiumConfig {
  const raw = (api.pluginConfig ?? {}) as AppiumPluginConfig;
  const serverPort = raw.serverPort ?? DEFAULT_APPIUM_PORT;
  const serverUrl = raw.serverUrl?.trim() || `http://127.0.0.1:${serverPort}`;
  const workspace =
    raw.testWorkdir?.trim() ||
    api.config?.agents?.defaults?.workspace?.trim() ||
    process.cwd();
  return {
    serverPort,
    serverUrl,
    testWorkdir: workspace,
    defaultPlatform: raw.defaultPlatform ?? "android",
    appiumPath: raw.appiumPath?.trim() || undefined,
    adbPath: raw.adbPath?.trim() || undefined,
    autoStartServer: raw.autoStartServer !== false,
    runTimeoutSec: raw.runTimeoutSec ?? DEFAULT_RUN_TIMEOUT_SEC,
    androidDriver: raw.androidDriver?.trim() || DEFAULT_ANDROID_DRIVER,
    iosDriver: raw.iosDriver?.trim() || DEFAULT_IOS_DRIVER,
  };
}

export function resolvePlatforms(
  requested: AppiumPlatform | undefined,
  config: ResolvedAppiumConfig,
): AppiumPlatform[] {
  if (requested) {
    return [requested];
  }
  return [config.defaultPlatform];
}
