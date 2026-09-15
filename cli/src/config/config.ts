/**
 * Local CLI profile: session cookie, selected project, stored project keys.
 *
 * Stored at `~/.wani/config.json` with `0600` permissions (dir `0700`).
 * Secrets here never leave the machine except as auth headers to Wani.
 */
import * as fs from "node:fs";
import { configFilePath, configHome } from "./paths.js";

export interface CliConfig {
  version: 1;
  /** Base URL override persisted via `--base-url` (env/flag win at runtime). */
  baseUrl?: string;
  /** Raw `dev-session` cookie value from `wani login`. */
  sessionCookie?: string;
  /** Currently selected project id (`wani project use`). */
  currentProjectId?: string;
  /** Project API keys saved via `wani project use --api-key`. */
  apiKeys: Record<string, string>;
}

const EMPTY: CliConfig = { version: 1, apiKeys: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function loadConfig(): CliConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(configFilePath(), "utf8");
  } catch {
    return { ...EMPTY, apiKeys: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...EMPTY, apiKeys: {} };
    const apiKeys: Record<string, string> = {};
    if (isRecord(parsed["apiKeys"])) {
      for (const [k, v] of Object.entries(parsed["apiKeys"])) {
        if (typeof v === "string" && v !== "") apiKeys[k] = v;
      }
    }
    const config: CliConfig = { version: 1, apiKeys };
    if (typeof parsed["baseUrl"] === "string" && parsed["baseUrl"] !== "") {
      config.baseUrl = parsed["baseUrl"];
    }
    if (typeof parsed["sessionCookie"] === "string" && parsed["sessionCookie"] !== "") {
      config.sessionCookie = parsed["sessionCookie"];
    }
    if (typeof parsed["currentProjectId"] === "string" && parsed["currentProjectId"] !== "") {
      config.currentProjectId = parsed["currentProjectId"];
    }
    return config;
  } catch {
    return { ...EMPTY, apiKeys: {} };
  }
}

export function saveConfig(config: CliConfig): void {
  fs.mkdirSync(configHome(), { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(configHome(), 0o700);
  } catch {
    // best effort (e.g. filesystems without unix modes)
  }
  fs.writeFileSync(configFilePath(), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  try {
    fs.chmodSync(configFilePath(), 0o600);
  } catch {
    // best effort
  }
}

/** Resolve the effective base URL: flag > env > stored config > default. */
export function resolveBaseUrl(args: { flag?: string | undefined; config?: CliConfig | undefined; fallback: string }): string {
  const fromFlag = args.flag?.trim();
  if (fromFlag) return fromFlag.replace(/\/+$/, "");
  const fromEnv = process.env["WANI_BASE_URL"]?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const fromConfig = args.config?.baseUrl?.trim();
  if (fromConfig) return fromConfig.replace(/\/+$/, "");
  return args.fallback;
}
