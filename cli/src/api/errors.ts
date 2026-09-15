/**
 * CLI error model. Secrets are never embedded in messages or details.
 */

export type CliErrorKind =
  | "usage" // bad flags/arguments (exit 2)
  | "auth" // missing/invalid credentials
  | "http" // transport or API failure
  | "config"; // local profile unreadable/unwritable

export class CliError extends Error {
  readonly kind: CliErrorKind;
  readonly status?: number | undefined;
  readonly code?: string | undefined;
  readonly details?: unknown;
  /** Exit code for `process.exitCode`. */
  readonly exitCode: number;

  constructor(message: string, opts?: { kind?: CliErrorKind | undefined; status?: number | undefined; code?: string | undefined; details?: unknown }) {
    super(message);
    this.name = "CliError";
    this.kind = opts?.kind ?? "http";
    this.status = opts?.status;
    this.code = opts?.code;
    this.details = opts?.details;
    this.exitCode = this.kind === "usage" ? 2 : 1;
  }
}

export function isCliError(err: unknown): err is CliError {
  return err instanceof CliError;
}
