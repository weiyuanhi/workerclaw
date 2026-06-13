---
name: appium
description: Install Appium, inspect devices, and run mobile UI test commands through OpenClaw tools.
metadata:
  {
    "openclaw":
      {
        "emoji": "📱",
        "requires":
          {
            "config": ["plugins.entries.appium.enabled"],
            "anyBins": ["npm"],
          },
        "install":
          [
            {
              "id": "npm-appium",
              "kind": "node",
              "package": "appium",
              "bins": ["appium"],
              "label": "Install Appium CLI (npm global)",
            },
          ],
      },
  }
---

# Appium Mobile Tests

Use this skill when the user wants OpenClaw to drive **mobile UI automation** through Appium.

OpenClaw does not click arbitrary apps directly. This plugin installs Appium, checks devices, starts a local Appium server when needed, and runs the user's test command with `APPIUM_SERVER_URL` set.

## Prerequisites the plugin does not install

- **Android:** Android platform-tools (`adb`), emulator or USB device with debugging enabled
- **iOS (macOS only):** Xcode, simulator or provisioned device, WebDriverAgent setup

## Tool flow

1. `appium_status` — check Appium CLI, drivers, adb/simulators, server health
2. `appium_setup` — `npm install -g appium` + install drivers (`uiautomator2`, `xcuitest`)
3. `appium_devices` — list adb devices and iOS simulators
4. `appium_run` — run the user's test command in `testWorkdir`

## Enable the tools

The tools are optional. Allowlist them on the agent:

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

## Configure defaults

```json
{
  "plugins": {
    "entries": {
      "appium": {
        "enabled": true,
        "config": {
          "testWorkdir": "/path/to/mobile-tests",
          "defaultPlatform": "android",
          "autoStartServer": true,
          "runTimeoutSec": 3600
        }
      }
    }
  }
}
```

## Example agent workflow

1. Call `appium_status`
2. If Appium missing, call `appium_setup` with `{ "platform": "android" }`
3. Confirm a device with `appium_devices`
4. Run tests:

```json
{
  "command": "npm test",
  "workdir": "/path/to/mobile-tests"
}
```

Or WebdriverIO:

```json
{
  "command": "npx wdio run wdio.conf.js --spec tests/login.spec.js"
}
```

5. Parse stdout/stderr and report pass/fail to the user.

## CLI equivalents

```bash
openclaw appium status
openclaw appium setup --platform android
openclaw appium devices
openclaw appium run --command "npm test" --workdir /path/to/mobile-tests
```

## Install on another machine

Bundled with workerclaw/OpenClaw checkout: enable in config.

External install:

```bash
openclaw plugins install @openclaw/appium
openclaw appium setup --platform android
```

Then allowlist the tools on your agent and set `testWorkdir`.
