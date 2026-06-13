# Appium plugin

OpenClaw plugin that installs Appium, probes Android/iOS targets, and runs mobile UI test commands for agents.

## What it does

- **`appium_status`** — Appium CLI, drivers, adb/simulators, server `/status`
- **`appium_setup`** — `npm install -g appium` + driver install
- **`appium_devices`** — adb devices + iOS simulators
- **`appium_run`** — run your test shell command with `APPIUM_SERVER_URL`

## What it does not do

- Install Android SDK, Xcode, or emulators
- Replace WebdriverIO/Maestro/Appium test scripts — you still author those
- Control phones through OpenClaw mobile nodes (use this plugin + adb/simulator instead)

## Quick start (bundled checkout)

1. Enable the plugin:

```json
{
  "plugins": {
    "entries": {
      "appium": { "enabled": true }
    }
  }
}
```

2. Allowlist tools on your agent (tools are optional):

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["appium_status", "appium_setup", "appium_devices", "appium_run"]
        }
      }
    ]
  }
}
```

3. Install Appium and drivers:

```bash
openclaw appium setup --platform android
```

4. Run tests:

```bash
openclaw appium run --command "npm test" --workdir ./mobile-tests
```

## Install on another computer

```bash
openclaw plugins install @openclaw/appium
# or after ClawHub publish:
openclaw plugins install clawhub:@openclaw/appium
```

Restart Gateway after install, then run `openclaw appium setup`.

## Agent skill

Ships `skills/appium/SKILL.md` with the recommended workflow for agents. The plugin
manifest must declare `"skills": ["./skills"]` so Gateway publishes it under
**Installed Skills** in the Control UI.

After enabling the plugin, restart Gateway and refresh the agent Skills panel.

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `serverPort` | `4723` | Local Appium port |
| `serverUrl` | `http://127.0.0.1:<port>` | Override server URL |
| `testWorkdir` | agent workspace | Default cwd for `appium_run` |
| `defaultPlatform` | `android` | Default for setup |
| `autoStartServer` | `true` | Start Appium before `appium_run` |
| `runTimeoutSec` | `3600` | Test command timeout |
| `androidDriver` | `uiautomator2` | Android driver for setup |
| `iosDriver` | `xcuitest` | iOS driver for setup |
| `appiumPath` | PATH probe | Explicit Appium binary |
| `adbPath` | PATH probe | Explicit adb binary |
