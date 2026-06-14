import { buildJsonPluginConfigSchema } from "openclaw/plugin-sdk/plugin-entry";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { appiumPluginConfigSchema } from "./src/config.js";
import { registerAppiumCli } from "./src/cli.js";
import { stopManagedAppiumServer } from "./src/run.js";
import { registerAppiumTools } from "./src/tools.js";

export default definePluginEntry({
  id: "appium",
  name: "Appium",
  description: "Install Appium, list devices, and run mobile UI test commands from OpenClaw agents.",
  configSchema: buildJsonPluginConfigSchema(appiumPluginConfigSchema),
  register(api) {
    registerAppiumTools(api);
    registerAppiumCli(api);
    api.registerService({
      id: "appium-server",
      // Appium starts on demand via ensureAppiumServer when tools/commands run.
      start: async () => {},
      stop: async () => {
        await stopManagedAppiumServer();
      },
    });
  },
});
