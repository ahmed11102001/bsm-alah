/**
 * Error reporting. Human mode writes to stderr; JSON mode emits a single
 * machine-readable document (still on stderr so stdout stays clean for pipes).
 */
import { CliError } from "../api/errors.js";
import { printJson } from "./json.js";

export function printError(err: unknown, jsonMode: boolean): number {
  if (err instanceof CliError) {
    if (jsonMode) {
      process.stderr.write(
        JSON.stringify({ ok: false, error: err.message, ...(err.code ? { code: err.code } : {}) }) + "\n"
      );
    } else {
      process.stderr.write(`Error: ${err.message}\n`);
    }
    return err.exitCode;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (jsonMode) {
    process.stderr.write(JSON.stringify({ ok: false, error: message }) + "\n");
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  return 1;
}
