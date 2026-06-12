/**
 * Personal fork product mode: local Control UI app only, no external messaging.
 *
 * Messaging channel extensions, CLI commands, and agent tools are removed from
 * this fork — not gated behind flags.
 */
import { isTruthyEnvValue } from "../infra/env.js";

export const UI_ONLY_PRODUCT = true;

/** Control UI routes that redirect to Chat in the local app. */
export const UI_ONLY_BLOCKED_UI_TABS = [
  "channels",
  "cron",
  "communications",
  "automation",
  "instances",
  "sessions",
  "usage",
  "overview",
  "activity",
  "workboard",
  "dreams",
  "infrastructure",
] as const;

export type UiOnlyBlockedUiTab = (typeof UI_ONLY_BLOCKED_UI_TABS)[number];

export function isUiOnlyProduct(): boolean {
  return UI_ONLY_PRODUCT;
}

export function getUiOnlyBlockedUiTabSet(): ReadonlySet<string> {
  return new Set(UI_ONLY_BLOCKED_UI_TABS);
}

export function isUiOnlyBlockedUiTab(tab: string): boolean {
  return isUiOnlyProduct() && getUiOnlyBlockedUiTabSet().has(tab);
}

/** True when channel plugins must not start (local app or explicit test/dev skip). */
export function shouldSkipChannelStartup(): boolean {
  return (
    isUiOnlyProduct() ||
    isTruthyEnvValue(process.env.OPENCLAW_SKIP_CHANNELS) ||
    isTruthyEnvValue(process.env.OPENCLAW_SKIP_PROVIDERS)
  );
}

/** True when scheduled cron jobs must not run. */
export function shouldSkipCronService(): boolean {
  return isUiOnlyProduct();
}

/** True when channel heartbeat loops must not run. */
export function shouldSkipHeartbeatRunner(): boolean {
  return isUiOnlyProduct();
}

/** True when recovering outbound channel deliveries on startup. */
export function shouldSkipOutboundDeliveryRecovery(): boolean {
  return isUiOnlyProduct();
}
