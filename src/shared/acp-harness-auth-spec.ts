/** Browser-safe ACP harness authentication metadata for Control UI and Gateway. */

export type AcpHarnessAuthEnvVarSpec = {
  key: string;
  label: string;
};

export type AcpHarnessCredentialReader = "claude" | "codex" | "gemini";

export type AcpHarnessAuthSpec = {
  harnessId: string;
  displayName: string;
  cliBinary: string;
  envVars: readonly AcpHarnessAuthEnvVarSpec[];
  supportsBrowserLogin: boolean;
  loginArgs?: readonly string[];
  statusArgs?: readonly string[];
  clearBrowserBlockEnvVar?: string;
  credentialReader?: AcpHarnessCredentialReader;
  manualLoginHint?: string;
};

export const CURSOR_HARNESS_ID = "cursor";
export const CURSOR_API_KEY_ENV = "CURSOR_API_KEY";

/** Harness auth metadata for built-in acpx aliases that commonly need host auth. */
export const ACP_HARNESS_AUTH_SPECS = [
  {
    harnessId: "cursor",
    displayName: "Cursor",
    cliBinary: "cursor-agent",
    envVars: [{ key: CURSOR_API_KEY_ENV, label: CURSOR_API_KEY_ENV }],
    supportsBrowserLogin: true,
    loginArgs: ["login"],
    statusArgs: ["status"],
    clearBrowserBlockEnvVar: "NO_OPEN_BROWSER",
  },
  {
    harnessId: "claude",
    displayName: "Claude Code",
    cliBinary: "claude",
    envVars: [{ key: "ANTHROPIC_API_KEY", label: "ANTHROPIC_API_KEY" }],
    supportsBrowserLogin: true,
    loginArgs: ["auth", "login"],
    statusArgs: ["auth", "status", "--text"],
    credentialReader: "claude",
  },
  {
    harnessId: "codex",
    displayName: "Codex",
    cliBinary: "codex",
    envVars: [
      { key: "CODEX_API_KEY", label: "CODEX_API_KEY" },
      { key: "OPENAI_API_KEY", label: "OPENAI_API_KEY" },
    ],
    supportsBrowserLogin: true,
    loginArgs: ["login"],
    credentialReader: "codex",
  },
  {
    harnessId: "copilot",
    displayName: "GitHub Copilot",
    cliBinary: "copilot",
    envVars: [
      { key: "COPILOT_GITHUB_TOKEN", label: "COPILOT_GITHUB_TOKEN" },
      { key: "GH_TOKEN", label: "GH_TOKEN" },
      { key: "GITHUB_TOKEN", label: "GITHUB_TOKEN" },
    ],
    supportsBrowserLogin: true,
    loginArgs: ["login"],
  },
  {
    harnessId: "gemini",
    displayName: "Gemini CLI",
    cliBinary: "gemini",
    envVars: [{ key: "GEMINI_API_KEY", label: "GEMINI_API_KEY" }],
    supportsBrowserLogin: false,
    credentialReader: "gemini",
    manualLoginHint:
      "Run `gemini` on the Gateway host and choose Sign in with Google, or set GEMINI_API_KEY.",
  },
  {
    harnessId: "droid",
    displayName: "Factory Droid",
    cliBinary: "droid",
    envVars: [{ key: "FACTORY_API_KEY", label: "FACTORY_API_KEY" }],
    supportsBrowserLogin: false,
    manualLoginHint: "Set FACTORY_API_KEY or authenticate the Factory Droid CLI on the Gateway host.",
  },
  {
    harnessId: "kimi",
    displayName: "Kimi",
    cliBinary: "kimi",
    envVars: [
      { key: "KIMI_API_KEY", label: "KIMI_API_KEY" },
      { key: "MOONSHOT_API_KEY", label: "MOONSHOT_API_KEY" },
    ],
    supportsBrowserLogin: false,
    manualLoginHint: "Set KIMI_API_KEY or MOONSHOT_API_KEY, or authenticate the Kimi CLI on the Gateway host.",
  },
  {
    harnessId: "qwen",
    displayName: "Qwen",
    cliBinary: "qwen",
    envVars: [
      { key: "QWEN_API_KEY", label: "QWEN_API_KEY" },
      { key: "DASHSCOPE_API_KEY", label: "DASHSCOPE_API_KEY" },
    ],
    supportsBrowserLogin: false,
    manualLoginHint: "Set QWEN_API_KEY or DASHSCOPE_API_KEY, or authenticate the Qwen CLI on the Gateway host.",
  },
  {
    harnessId: "opencode",
    displayName: "OpenCode",
    cliBinary: "opencode",
    envVars: [
      { key: "OPENCODE_API_KEY", label: "OPENCODE_API_KEY" },
      { key: "OPENCODE_ZEN_API_KEY", label: "OPENCODE_ZEN_API_KEY" },
    ],
    supportsBrowserLogin: false,
    manualLoginHint:
      "Set OPENCODE_API_KEY or OPENCODE_ZEN_API_KEY, or authenticate OpenCode on the Gateway host.",
  },
  {
    harnessId: "kilocode",
    displayName: "Kilo Code",
    cliBinary: "kilocode",
    envVars: [],
    supportsBrowserLogin: false,
    manualLoginHint: "Install and authenticate the Kilo Code CLI on the Gateway host.",
  },
  {
    harnessId: "iflow",
    displayName: "iFlow",
    cliBinary: "iflow",
    envVars: [],
    supportsBrowserLogin: false,
    manualLoginHint: "Install and authenticate the iFlow CLI on the Gateway host.",
  },
  {
    harnessId: "kiro",
    displayName: "Kiro",
    cliBinary: "kiro-cli",
    envVars: [],
    supportsBrowserLogin: false,
    manualLoginHint: "Install and authenticate the Kiro CLI on the Gateway host.",
  },
] as const satisfies readonly AcpHarnessAuthSpec[];

const harnessAuthSpecById = new Map(
  ACP_HARNESS_AUTH_SPECS.map((spec) => [spec.harnessId, spec] as const),
);

export function resolveAcpHarnessAuthSpec(harnessId: string): AcpHarnessAuthSpec | undefined {
  const normalized = harnessId.trim().toLowerCase();
  return harnessAuthSpecById.get(normalized);
}

export function listAcpHarnessAuthSpecIds(): string[] {
  return ACP_HARNESS_AUTH_SPECS.map((spec) => spec.harnessId);
}

/** Returns harness auth specs relevant to the current ACP form selection. */
export function resolveRelevantAcpHarnessAuthSpecs(params: {
  acpEnabled: boolean;
  defaultAgent?: string;
  allowedAgents?: readonly string[];
}): AcpHarnessAuthSpec[] {
  if (!params.acpEnabled) {
    return [];
  }
  const selected = new Set<string>();
  const defaultAgent = params.defaultAgent?.trim().toLowerCase();
  if (defaultAgent) {
    selected.add(defaultAgent);
  }
  for (const agent of params.allowedAgents ?? []) {
    const normalized = agent.trim().toLowerCase();
    if (normalized) {
      selected.add(normalized);
    }
  }
  return ACP_HARNESS_AUTH_SPECS.filter((spec) => selected.has(spec.harnessId));
}
