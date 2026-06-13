#!/usr/bin/env node
// Generates Control UI config hint label/help maps for AI & Agents settings sections.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = path.join(ROOT, "ui/src/i18n/generated");
const SECTION_PREFIXES = ["agents", "models", "skills", "tools", "memory", "session"];

const { FIELD_LABELS } = await import("../src/config/schema.labels.ts");
const { FIELD_HELP } = await import("../src/config/schema.help.ts");

function filterByPrefixes(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) =>
      SECTION_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)),
    ),
  );
}

const LABELS_EN = filterByPrefixes(FIELD_LABELS);
const HELP_EN = filterByPrefixes(FIELD_HELP);

/** Longest-match glossary for zh-CN config hint translation. */
const ZH_GLOSSARY = [
  ["Agent Communication Protocol", "Agent Communication Protocol"],
  ["Memory Backend", "记忆后端"],
  ["Memory Search", "记忆搜索"],
  ["Default Context Limits", "默认上下文限制"],
  ["Default memory_get Max Chars", "默认 memory_get 最大字符数"],
  ["Default memory_get Line Window", "默认 memory_get 行窗口"],
  ["Default Tool Result Max Chars", "默认工具结果最大字符数"],
  ["Default Post-compaction Max Chars", "默认压缩后最大字符数"],
  ["Post-compaction Max Chars", "压缩后最大字符数"],
  ["Post-compaction", "压缩后"],
  ["Tool-loop Global Circuit Breaker Threshold", "工具循环全局熔断阈值"],
  ["Tool-loop Critical Threshold", "工具循环严重阈值"],
  ["Tool-loop Warning Threshold", "工具循环警告阈值"],
  ["Tool-loop Poll No-Progress Detection", "工具循环轮询无进展检测"],
  ["Tool-loop Ping-Pong Detection", "工具循环乒乓检测"],
  ["Tool-loop Generic Repeat Detection", "工具循环通用重复检测"],
  ["Tool-loop History Size", "工具循环历史大小"],
  ["Tool-loop Detection", "工具循环检测"],
  ["Tool-loop", "工具循环"],
  ["Unknown-tool Loop Threshold", "未知工具循环阈值"],
  ["Image Understanding Attachment Policy", "图像理解附件策略"],
  ["Image Understanding Max Bytes", "图像理解最大字节数"],
  ["Image Understanding Max Chars", "图像理解最大字符数"],
  ["Image Understanding Timeout (sec)", "图像理解超时（秒）"],
  ["Image Understanding Models", "图像理解模型"],
  ["Image Understanding Scope", "图像理解范围"],
  ["Image Understanding Prompt", "图像理解提示词"],
  ["Enable Image Understanding", "启用图像理解"],
  ["Video Understanding Attachment Policy", "视频理解附件策略"],
  ["Video Understanding Max Bytes", "视频理解最大字节数"],
  ["Video Understanding Max Chars", "视频理解最大字符数"],
  ["Video Understanding Timeout (sec)", "视频理解超时（秒）"],
  ["Video Understanding Models", "视频理解模型"],
  ["Video Understanding Scope", "视频理解范围"],
  ["Video Understanding Prompt", "视频理解提示词"],
  ["Enable Video Understanding", "启用视频理解"],
  ["Link Understanding Max Links", "链接理解最大链接数"],
  ["Link Understanding Timeout (sec)", "链接理解超时（秒）"],
  ["Link Understanding Models", "链接理解模型"],
  ["Link Understanding Scope", "链接理解范围"],
  ["Enable Link Understanding", "启用链接理解"],
  ["Media Understanding Shared Models", "媒体理解共享模型"],
  ["Media Understanding Concurrency", "媒体理解并发数"],
  ["Async Media Completion Direct Send", "异步媒体完成直接发送"],
  ["Memory Search", "记忆搜索"],
  ["memory_get Max Chars", "memory_get 最大字符数"],
  ["memory_get Line Window", "memory_get 行窗口"],
  ["Tool Result Max Chars", "工具结果最大字符数"],
  ["Tool Allowlist Additions", "工具允许列表附加项"],
  ["Tool Allowlist", "工具允许列表"],
  ["Tool Denylist", "工具拒绝列表"],
  ["Tool Profile", "工具配置文件"],
  ["Tool Policy by Provider", "按提供商的工具策略"],
  ["Session Tools Visibility", "会话工具可见性"],
  ["Session management and persistence", "会话管理与持久化"],
  ["Workspace-only FS tools", "仅工作区文件系统工具"],
  ["apply_patch Model Allowlist", "apply_patch 模型允许列表"],
  ["apply_patch Workspace-Only", "apply_patch 仅工作区"],
  ["Enable apply_patch", "启用 apply_patch"],
  ["Exec Approval Running Notice (ms)", "Exec 审批运行通知（毫秒）"],
  ["Exec Notify On Empty Success", "Exec 空成功时通知"],
  ["Exec Notify On Exit", "Exec 退出时通知"],
  ["Exec Reviewer Timeout (ms)", "Exec 审查器超时（毫秒）"],
  ["Exec Reviewer Model", "Exec 审查器模型"],
  ["Exec Reviewer", "Exec 审查器"],
  ["Exec Security", "Exec 安全策略"],
  ["Exec Target", "Exec 目标"],
  ["Exec Mode", "Exec 模式"],
  ["Exec Node Binding", "Exec 节点绑定"],
  ["Exec Ask", "Exec 询问策略"],
  ["Exec Tool", "Exec 工具"],
  ["Web Tools", "Web 工具"],
  ["Agent Skill Filter", "代理技能筛选器"],
  ["Agent Skills Limits", "代理技能限制"],
  ["Agent Skills Prompt Max Chars", "代理技能提示最大字符数"],
  ["Agent Tool Profile", "代理工具配置文件"],
  ["Agent Tool Allowlist Additions", "代理工具允许列表附加项"],
  ["Agent Tool Policy by Provider", "代理按提供商工具策略"],
  ["Agent Message Action Allowlist", "代理消息动作允许列表"],
  ["Agent Model Overrides", "代理模型覆盖"],
  ["Agent Model Runtime ID", "代理模型运行时 ID"],
  ["Agent Model Runtime", "代理模型运行时"],
  ["Agent Runtime Type", "代理运行时类型"],
  ["Agent ACP Working Directory", "代理 ACP 工作目录"],
  ["Agent ACP Harness Agent", "代理 ACP Harness Agent"],
  ["Agent ACP Backend", "代理 ACP 后端"],
  ["Agent ACP Mode", "代理 ACP 模式"],
  ["Agent ACP Runtime", "代理 ACP 运行时"],
  ["Agent Runtime", "代理运行时"],
  ["Legacy Agent Runtime ID", "旧版代理运行时 ID"],
  ["Legacy Agent Runtime", "旧版代理运行时"],
  ["Agent Thinking Default", "代理思考默认值"],
  ["Agent Reasoning Default", "代理推理默认值"],
  ["Agent Fast Mode Default", "代理快速模式默认值"],
  ["Agent Context Injection", "代理上下文注入"],
  ["Agent Bootstrap Max Chars", "代理 Bootstrap 最大字符数"],
  ["Agent Bootstrap Total Max Chars", "代理 Bootstrap 总最大字符数"],
  ["Agent Experimental Flags", "代理实验性标志"],
  ["Agent Lean Local Model Mode", "代理精简本地模型模式"],
  ["Agent Context Limits", "代理上下文限制"],
  ["Agent Defaults", "代理默认值"],
  ["Agent List", "代理列表"],
  ["Agent Code Mode", "代理代码模式"],
  ["Agent configurations, models, and identities", "代理配置、模型与身份"],
  ["Identity Avatar", "身份头像"],
  ["Identity Name", "身份名称"],
  ["Primary Model", "主模型"],
  ["Fallback Models", "备用模型"],
  ["Thinking Level", "思考级别"],
  ["Reasoning Level", "推理级别"],
  ["Fast Mode", "快速模式"],
  ["Context Window", "上下文窗口"],
  ["Max Tokens", "最大 Token 数"],
  ["Temperature", "温度"],
  ["Top P", "Top P"],
  ["Skill packs and capabilities", "技能包与能力"],
  ["AI model configurations and providers", "AI 模型配置与提供商"],
  ["Tool configurations (browser, search, etc.)", "工具配置（浏览器、搜索等）"],
  ["Allowlist", "允许列表"],
  ["Denylist", "拒绝列表"],
  ["Enabled", "已启用"],
  ["Disabled", "已禁用"],
  ["Enable", "启用"],
  ["Disable", "禁用"],
  ["Default", "默认"],
  ["Defaults", "默认项"],
  ["Maximum", "最大"],
  ["Max ", "最大 "],
  ["Minimum", "最小"],
  ["Min ", "最小 "],
  ["Timeout", "超时"],
  ["Interval", "间隔"],
  ["Threshold", "阈值"],
  ["Concurrency", "并发数"],
  ["Provider", "提供商"],
  ["Providers", "提供商"],
  ["Configuration", "配置"],
  ["Configurations", "配置"],
  ["Override", "覆盖"],
  ["Overrides", "覆盖项"],
  ["Policy", "策略"],
  ["Profile", "配置文件"],
  ["Workspace", "工作区"],
  ["Session", "会话"],
  ["Sessions", "会话"],
  ["Memory", "记忆"],
  ["Skills", "技能"],
  ["Tools", "工具"],
  ["Models", "模型"],
  ["Agents", "代理"],
  ["Agent", "代理"],
  ["Backend", "后端"],
  ["Search", "搜索"],
  ["Embedding", "嵌入"],
  ["Embeddings", "嵌入"],
  ["Vector", "向量"],
  ["Remote", "远程"],
  ["Local", "本地"],
  ["Batch", "批处理"],
  ["Scope", "范围"],
  ["Sources", "来源"],
  ["Citations", "引用"],
  ["Backend", "后端"],
  ["Experimental", "实验性"],
  ["Heartbeat", "心跳"],
  ["Compaction", "压缩"],
  ["Bootstrap", "Bootstrap"],
  ["Runtime", "运行时"],
  ["Identity", "身份"],
  ["Channel", "频道"],
  ["Channels", "频道"],
  ["Binding", "绑定"],
  ["Bindings", "绑定"],
  ["History", "历史"],
  ["Visibility", "可见性"],
  ["Understanding", "理解"],
  ["Attachment", "附件"],
  ["Attachments", "附件"],
  ["Prompt", "提示词"],
  ["Prompts", "提示词"],
  ["Chars", "字符"],
  ["Bytes", "字节"],
  ["Seconds", "秒"],
  ["Milliseconds", "毫秒"],
  ["Minutes", "分钟"],
  ["Hours", "小时"],
  ["Days", "天"],
  [" (ms)", "（毫秒）"],
  [" (sec)", "（秒）"],
  [" (hours)", "（小时）"],
  [" (minutes)", "（分钟）"],
  [" (days)", "（天）"],
  [" per Day", " 每日"],
  [" per ", " 每 "],
  [" and ", " 与 "],
  [" or ", " 或 "],
  [" for ", " 用于 "],
  [" with ", " 使用 "],
  [" from ", " 来自 "],
  [" to ", " 到 "],
  [" when ", " 当 "],
  [" during ", " 在…期间 "],
  [" before ", " 在…之前 "],
  [" after ", " 在…之后 "],
  ["Keep ", "保持 "],
  ["Use ", "使用 "],
  ["Enable ", "启用 "],
  ["Disable ", "禁用 "],
  ["Controls ", "控制 "],
  ["Optional ", "可选 "],
  ["Maximum time", "最大时间"],
  ["Minimum time", "最小时间"],
];

function translateConfigHintZh(text) {
  if (!text) {
    return text;
  }
  let out = text;
  for (const [source, target] of ZH_GLOSSARY) {
    out = out.split(source).join(target);
  }
  return out;
}

function translateMap(enMap) {
  return Object.fromEntries(Object.entries(enMap).map(([key, value]) => [key, translateConfigHintZh(value)]));
}

const LABELS_ZH = translateMap(LABELS_EN);

const HELP_ZH_CACHE_PATH = path.join(ROOT, "ui/src/i18n/.i18n/config-hints-help.zh-CN.json");

async function loadHelpZhCache() {
  if (!existsSync(HELP_ZH_CACHE_PATH)) {
    return {};
  }
  const raw = await readFile(HELP_ZH_CACHE_PATH, "utf8");
  return JSON.parse(raw);
}

const HELP_ZH_CACHE = await loadHelpZhCache();
const HELP_ZH = Object.fromEntries(
  Object.entries(HELP_EN).map(([key, value]) => [key, HELP_ZH_CACHE[key] ?? value]),
);
const missingHelpZh = Object.keys(HELP_EN).filter((key) => !HELP_ZH_CACHE[key]);
if (missingHelpZh.length > 0) {
  console.warn(`warning: ${missingHelpZh.length} help strings missing zh-CN cache entries`);
}

function renderMap(name, map) {
  const lines = Object.entries(map)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  return `export const ${name} = {\n${lines.join("\n")}\n} as const;\n`;
}

const output = `// Generated by scripts/generate-ui-config-hints.mjs — do not edit by hand.
import type { Locale } from "../lib/types.ts";

export type ConfigHintMaps = {
  labels: Record<string, string>;
  help: Record<string, string>;
};

export const CONFIG_HINTS_EN: ConfigHintMaps = {
  labels: ${JSON.stringify(LABELS_EN, null, 2)},
  help: ${JSON.stringify(HELP_EN, null, 2)},
};

export const CONFIG_HINTS_ZH_CN: ConfigHintMaps = {
  labels: ${JSON.stringify(LABELS_ZH, null, 2)},
  help: ${JSON.stringify(HELP_ZH, null, 2)},
};

export const CONFIG_HINTS_BY_LOCALE: Partial<Record<Locale, ConfigHintMaps>> = {
  en: CONFIG_HINTS_EN,
  "zh-CN": CONFIG_HINTS_ZH_CN,
};
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "config-hints.ts"), output, "utf8");
console.log(
  `generated config hints: labels=${Object.keys(LABELS_EN).length} help=${Object.keys(HELP_EN).length}`,
);
