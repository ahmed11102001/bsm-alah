/** JSON output mode (`--json`). Single JSON document on stdout. */
export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}
