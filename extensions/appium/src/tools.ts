import { optionalStringEnum } from "openclaw/plugin-sdk/channel-actions";
import { readPositiveIntegerParam } from "openclaw/plugin-sdk/param-readers";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import {
  APPIUM_PLATFORM_VALUES,
  resolveAppiumConfig,
  resolvePlatforms,
  type AppiumPlatform,
} from "./config.js";
import { probeAppiumEnvironment } from "./probe.js";
import { runAppiumTestCommand } from "./run.js";
import { setupAppiumEnvironment } from "./setup.js";

function readOptionalPlatform(value: unknown, fieldName: string): AppiumPlatform | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const normalized = value.trim().toLowerCase();
  if (!APPIUM_PLATFORM_VALUES.includes(normalized as AppiumPlatform)) {
    throw new Error(`${fieldName} must be android or ios`);
  }
  return normalized as AppiumPlatform;
}

function readOptionalEnv(value: unknown): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("env must be an object");
  }
  const env: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error(`env.${key} must be a string`);
    }
    env[key] = entry;
  }
  return env;
}

export function registerAppiumTools(api: OpenClawPluginApi): void {
  const optionalPlatformSchema = optionalStringEnum(APPIUM_PLATFORM_VALUES);

  api.registerTool(
    {
      name: "appium_status",
      label: "Appium Status",
      description:
        "Check Appium CLI, drivers, adb/iOS simulators, and local Appium server health before running mobile tests.",
      parameters: Type.Object({}, { additionalProperties: false }),
      execute: async () => {
        const config = resolveAppiumConfig(api);
        return await probeAppiumEnvironment({
          appiumPath: config.appiumPath,
          adbPath: config.adbPath,
          serverUrl: config.serverUrl,
        });
      },
    },
    { optional: true },
  );

  api.registerTool(
    {
      name: "appium_setup",
      label: "Appium Setup",
      description:
        "Install Appium globally via npm and install platform drivers (uiautomator2 for Android, xcuitest for iOS). Does not install adb or Xcode.",
      parameters: Type.Object(
        {
          platform: optionalPlatformSchema,
        },
        { additionalProperties: false },
      ),
      execute: async (_id, params) => {
        const config = resolveAppiumConfig(api);
        const platform = readOptionalPlatform(params.platform, "platform");
        return await setupAppiumEnvironment({
          platforms: resolvePlatforms(platform, config),
          androidDriver: config.androidDriver,
          iosDriver: config.iosDriver,
          appiumPath: config.appiumPath,
        });
      },
    },
    { optional: true },
  );

  api.registerTool(
    {
      name: "appium_devices",
      label: "Appium Devices",
      description: "List connected Android adb devices and available iOS simulators.",
      parameters: Type.Object({}, { additionalProperties: false }),
      execute: async () => {
        const config = resolveAppiumConfig(api);
        const status = await probeAppiumEnvironment({
          appiumPath: config.appiumPath,
          adbPath: config.adbPath,
          serverUrl: config.serverUrl,
        });
        return {
          android: status.android.devices,
          ios: status.ios.simulators,
        };
      },
    },
    { optional: true },
  );

  api.registerTool(
    {
      name: "appium_run",
      label: "Appium Run",
      description:
        "Run a shell command for mobile UI tests (WebdriverIO, Maestro wrapper, pytest, etc.) with APPIUM_SERVER_URL set and optional local Appium auto-start.",
      parameters: Type.Object(
        {
          command: Type.String({
            description: "Shell command to execute in the test suite directory.",
          }),
          workdir: Type.Optional(Type.String()),
          env: Type.Optional(Type.Record(Type.String(), Type.String())),
          platform: optionalPlatformSchema,
          startServer: Type.Optional(Type.Boolean()),
          timeoutSec: Type.Optional(Type.Number({ minimum: 1 })),
        },
        { additionalProperties: false },
      ),
      execute: async (_id, params) => {
        const config = resolveAppiumConfig(api);
        const command = typeof params.command === "string" ? params.command.trim() : "";
        if (!command) {
          throw new Error("command is required");
        }
        readOptionalPlatform(params.platform, "platform");
        const timeoutSec = readPositiveIntegerParam(params, "timeoutSec");
        return await runAppiumTestCommand({
          config,
          command,
          workdir: typeof params.workdir === "string" ? params.workdir : undefined,
          env: readOptionalEnv(params.env),
          startServer: typeof params.startServer === "boolean" ? params.startServer : undefined,
          timeoutSec,
        });
      },
    },
    { optional: true },
  );
}
