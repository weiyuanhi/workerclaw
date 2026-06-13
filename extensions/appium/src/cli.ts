import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { resolveAppiumConfig, resolvePlatforms, type AppiumPlatform } from "./config.js";
import { probeAppiumEnvironment } from "./probe.js";
import { runAppiumTestCommand } from "./run.js";
import { setupAppiumEnvironment } from "./setup.js";

function parsePlatformFlag(value: string | undefined): AppiumPlatform | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "android" || normalized === "ios") {
    return normalized;
  }
  throw new Error(`Invalid platform: ${value}`);
}

export function registerAppiumCli(api: OpenClawPluginApi): void {
  api.registerCli(
    async ({ program }) => {
      const appium = program.command("appium").description("Appium mobile test automation helpers");

      appium
        .command("status")
        .description("Check Appium CLI, drivers, devices, and server health")
        .option("--json", "Print JSON")
        .action(async (opts: { json?: boolean }) => {
          const config = resolveAppiumConfig(api);
          const status = await probeAppiumEnvironment({
            appiumPath: config.appiumPath,
            adbPath: config.adbPath,
            serverUrl: config.serverUrl,
          });
          if (opts.json) {
            console.log(JSON.stringify(status, null, 2));
            process.exit(status.ready ? 0 : 1);
          }
          console.log(`Appium: ${status.appium.installed ? status.appium.version ?? "installed" : "missing"}`);
          console.log(`Drivers: ${status.appium.drivers.join(", ") || "none"}`);
          console.log(`ADB devices: ${status.android.authorizedDevices}`);
          console.log(`Server ${status.server.url}: ${status.server.healthy ? "healthy" : "down"}`);
          if (status.missing.length) {
            console.log(`Missing: ${status.missing.join(", ")}`);
          }
          for (const note of status.notes) {
            console.log(`Note: ${note}`);
          }
          process.exit(status.ready ? 0 : 1);
        });

      appium
        .command("setup")
        .description("Install Appium globally and platform drivers")
        .option("--platform <platform>", "android or ios")
        .option("--json", "Print JSON")
        .action(async (opts: { platform?: string; json?: boolean }) => {
          const config = resolveAppiumConfig(api);
          const platform = parsePlatformFlag(opts.platform);
          const result = await setupAppiumEnvironment({
            platforms: resolvePlatforms(platform, config),
            androidDriver: config.androidDriver,
            iosDriver: config.iosDriver,
            appiumPath: config.appiumPath,
          });
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.ok ? 0 : 1);
          }
          if (result.appiumPath) {
            console.log(`Appium: ${result.version ?? "installed"} (${result.appiumPath})`);
          }
          if (result.installedDrivers.length) {
            console.log(`Installed drivers: ${result.installedDrivers.join(", ")}`);
          }
          if (result.skippedDrivers.length) {
            console.log(`Already installed: ${result.skippedDrivers.join(", ")}`);
          }
          for (const error of result.errors) {
            console.error(error);
          }
          for (const note of result.notes) {
            console.log(`Note: ${note}`);
          }
          process.exit(result.ok ? 0 : 1);
        });

      appium
        .command("devices")
        .description("List adb devices and iOS simulators")
        .option("--json", "Print JSON")
        .action(async (opts: { json?: boolean }) => {
          const config = resolveAppiumConfig(api);
          const status = await probeAppiumEnvironment({
            appiumPath: config.appiumPath,
            adbPath: config.adbPath,
            serverUrl: config.serverUrl,
          });
          const payload = {
            android: status.android.devices,
            ios: status.ios.simulators,
          };
          if (opts.json) {
            console.log(JSON.stringify(payload, null, 2));
            return;
          }
          for (const device of payload.android) {
            console.log(`android ${device.id} ${device.state}${device.details ? ` ${device.details}` : ""}`);
          }
          for (const simulator of payload.ios) {
            console.log(`ios ${simulator.name} ${simulator.udid} ${simulator.state}`);
          }
        });

      appium
        .command("run")
        .description("Run a test command with APPIUM_SERVER_URL set")
        .requiredOption("--command <command>", "Shell command to execute")
        .option("--workdir <path>", "Working directory")
        .option("--timeout-sec <seconds>", "Timeout in seconds", (value) => Number(value))
        .option("--no-start-server", "Do not auto-start a local Appium server")
        .option("--json", "Print JSON")
        .action(
          async (opts: {
            command: string;
            workdir?: string;
            timeoutSec?: number;
            startServer?: boolean;
            json?: boolean;
          }) => {
            const config = resolveAppiumConfig(api);
            const result = await runAppiumTestCommand({
              config,
              command: opts.command,
              workdir: opts.workdir,
              startServer: opts.startServer,
              timeoutSec: opts.timeoutSec,
            });
            if (opts.json) {
              console.log(JSON.stringify(result, null, 2));
            } else {
              if (result.stdout) {
                process.stdout.write(result.stdout);
              }
              if (result.stderr) {
                process.stderr.write(result.stderr);
              }
            }
            process.exit(result.ok ? 0 : result.code || 1);
          },
        );
    },
    {
      descriptors: [
        {
          name: "appium",
          description: "Install Appium, inspect devices, and run mobile test commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
