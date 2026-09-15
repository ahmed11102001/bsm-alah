/**
 * Minimal argv parser (no runtime dependencies).
 *
 * Supports:
 *   wani otp send --phone 2010... --template-id tpl_1
 *   wani otp send --phone=2010... --json
 *   wani project use my-project
 *   wani --help / wani otp --help
 */

export interface ParsedArgs {
  /** Command path, e.g. ["otp", "send"]. */
  command: string[];
  /** Positional arguments (non-flag tokens after the command). */
  positional: string[];
  /** `--flag value` / `--flag=value` options (kebab-case keys preserved). */
  options: Record<string, string | boolean>;
}

function normalizeKey(raw: string): string {
  return raw.replace(/^--?/, "");
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  let seenFlag = false;
  let i = 0;
  while (i < argv.length) {
    const token = argv[i] as string;
    if (token.startsWith("-") && token.length > 1) {
      seenFlag = true;
      const eq = token.indexOf("=");
      if (eq !== -1) {
        options[normalizeKey(token.slice(0, eq))] = token.slice(eq + 1);
        i += 1;
        continue;
      }
      const key = normalizeKey(token);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        options[key] = next;
        i += 2;
      } else {
        options[key] = true;
        i += 1;
      }
      continue;
    }
    if (!seenFlag && command.length < 3) {
      command.push(token);
    } else {
      positional.push(token);
    }
    i += 1;
  }

  return { command, positional, options };
}

/** Read a string option supporting both kebab-case and camelCase spellings. */
export function optString(options: Record<string, string | boolean>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = options[name];
    if (typeof value === "string" && value !== "") return value;
  }
  return undefined;
}

/** True when `--json` / `-j` was passed. */
export function isJsonOutput(options: Record<string, string | boolean>): boolean {
  return options["json"] === true || options["j"] === true;
}

/** True when `--help` / `-h` was passed. */
export function isHelpRequest(options: Record<string, string | boolean>, positional: string[]): boolean {
  return options["help"] === true || options["h"] === true || positional[0] === "help";
}
