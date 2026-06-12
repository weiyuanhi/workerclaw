# Local App Fork (Control UI Only)

This checkout is a **local desktop assistant**: Control UI + Gateway + Ollama on loopback. External messaging is **removed from source**, not disabled behind flags.

## What was deleted

### Channel extensions (`extensions/`)

Telegram, Discord, WhatsApp, Slack, Signal, iMessage, IRC, LINE, Matrix, Mattermost, MS Teams, Google Chat, Feishu, Nostr, Nextcloud Talk, Synology Chat, SMS, Zalo, QQ, Twitch, Tlon, Clickclack, QA channel, webhooks, voice-call, device-pair, thread-ownership, and related surfaces.

### CLI

`channels`, `pairing`, `directory`, `webhooks`, `qr`, `clawbot`, `message`, `cron` command trees and helpers.

### Agent tools

`message`, `sessions_send`, `sessions_list`, `sessions_history`, `cron` tool implementations.

### Control UI

Channels and cron views, controllers, and agent sub-panels.

## Product marker

`src/product/ui-only.ts` and `ui/src/ui/product-mode.ts` keep `UI_ONLY_PRODUCT = true` for gateway skips (no channel monitors, cron scheduler, outbound recovery, heartbeat to channels).

## Kept (local app core)

- `chat.send` → embedded agent in Control UI
- `src/auto-reply/**` reply pipeline (Control UI depends on it)
- `src/gateway/server-methods/chat.ts`
- `browser`, file/exec tools, `web_search`, Ollama provider plugin
- `openclaw gateway`, `dashboard`, `tui` / `chat` (local terminal UI)

## Daily use

```bash
pnpm install && pnpm build
/Volumes/SSD/model/ollama/start-ollama.sh
pnpm openclaw gateway run
openclaw dashboard   # http://127.0.0.1:18789
```

## Config notes

- No `channels` block needed in `openclaw.json`
- No `tools.deny` for removed tools — they no longer exist
- Model example: `ollama/qwen2.5:3b` with `OLLAMA_API_KEY=ollama-local`
- **Agents → Models**: add/edit dialog — pick **local vs cloud**, searchable provider chips (**51** LLM providers), model name, connection panel, advanced params, primary/fallback routing; one **Save** writes `env.vars`, `models.providers.*`, `agents.defaults.models`, and `agents.defaults.model`. UI defaults to **简体中文**.

## Revert to full OpenClaw

Re-clone or merge from upstream `openclaw/openclaw`; this fork intentionally deletes messaging surfaces.
