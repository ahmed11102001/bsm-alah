/**
 * Filesystem locations for CLI state.
 * Everything lives under `~/.wani/` (override with `WANI_CONFIG_HOME`, used
 * by tests and by users who want an isolated profile).
 */
import * as os from "node:os";
import * as path from "node:path";

export function configHome(): string {
  const override = process.env["WANI_CONFIG_HOME"];
  if (override && override.trim() !== "") return override;
  return path.join(os.homedir(), ".wani");
}

export function configFilePath(): string {
  return path.join(configHome(), "config.json");
}
