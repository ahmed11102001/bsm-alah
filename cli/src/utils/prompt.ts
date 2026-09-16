/**
 * Interactive stdin prompts (no runtime dependencies).
 * Password input hides typed characters (prints `*`).
 * `promptSelect` renders an arrow-key picker (↑/↓ + Enter).
 */
import * as readline from "node:readline";

export function promptText(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);

    // Non-TTY (piped input): fall back to a single line read.
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk: string) => {
        data += chunk;
      });
      stdin.on("end", () => {
        stdout.write("\n");
        resolve(data.replace(/[\r\n]+$/, ""));
      });
      stdin.resume();
      return;
    }

    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string): void => {
      const char = chunk;
      if (char === "\r" || char === "\n" || char === "\u0004") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u0003") {
        // Ctrl+C
        cleanup();
        stdout.write("\n");
        process.exit(130);
      }
      if (char === "\u007f" || char === "\b") {
        // Backspace
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }
      value += char;
      stdout.write("*");
    };

    const cleanup = (): void => {
      stdin.removeListener("data", onData);
      try {
        stdin.setRawMode(false);
      } catch {
        // ignore — best effort restore
      }
      stdin.pause();
    };

    stdin.on("data", onData);
  });
}

export interface SelectOption {
  /** Displayed label. */
  label: string;
  /** Extra dimmed detail shown after the label (e.g. an id). */
  detail?: string | undefined;
}

// ─── ANSI helpers (explicit \u001b escapes — never raw control bytes) ────────
const ESC = "\u001b";
const ANSI_HIDE_CURSOR = ESC + "[?25l";
const ANSI_SHOW_CURSOR = ESC + "[?25h";
const ANSI_CLEAR_LINE = ESC + "[2K\r";
const ANSI_UP = (n: number): string => (n > 0 ? `${ESC}[${n}A` : "");
const ANSI_GREEN = ESC + "[32m";
const ANSI_RESET_FG = ESC + "[39m";
const ANSI_DIM = ESC + "[2m";
const ANSI_RESET_DIM = ESC + "[22m";

/**
 * Pure frame renderer for the arrow-key picker — builds the visible block
 * for a given cursor position (unit-tested; no terminal side effects).
 */
export function renderSelectFrame(
  question: string,
  options: SelectOption[],
  selected: number
): string {
  const lines = [question];
  options.forEach((opt, i) => {
    const cursor = i === selected ? "❯" : " ";
    const label = i === selected ? `${ANSI_GREEN}${opt.label}${ANSI_RESET_FG}` : opt.label;
    const detail = opt.detail ? ` ${ANSI_DIM}${opt.detail}${ANSI_RESET_DIM}` : "";
    lines.push(`${cursor} ${label}${detail}`);
  });
  lines.push(`${ANSI_DIM}↑/↓ to move · Enter to select · Esc to cancel${ANSI_RESET_DIM}`);
  return lines.join("\n");
}

/**
 * Arrow-key picker. Returns the chosen index, or null on cancel (Esc).
 *
 * Non-TTY (piped input / `--json` scripts): falls back to a numbered list
 * and reads a line — never hangs waiting for escape sequences.
 * Ctrl+C always exits the process with code 130.
 */
export async function promptSelect(
  question: string,
  options: SelectOption[]
): Promise<number | null> {
  if (options.length === 0) return null;
  if (options.length === 1) return 0;

  const stdin = process.stdin;
  const stdout = process.stdout;

  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    options.forEach((opt, i) => {
      stdout.write(`  ${i + 1}) ${opt.label}${opt.detail ? ` — ${opt.detail}` : ""}\n`);
    });
    const answer = await promptText(`${question} [1-${options.length}]: `);
    if (answer.trim() === "") return 0;
    const n = Number(answer.trim());
    if (!Number.isInteger(n) || n < 1 || n > options.length) return null;
    return n - 1;
  }

  return new Promise((resolve) => {
    let selected = 0;
    // +1 for the hint line.
    const frameHeight = options.length + 2;
    let firstDraw = true;

    const draw = (): void => {
      if (!firstDraw) stdout.write(ANSI_UP(frameHeight));
      firstDraw = false;
      const frame = renderSelectFrame(question, options, selected);
      const rows = frame.split("\n");
      rows.forEach((row, i) => {
        stdout.write(ANSI_CLEAR_LINE + row + (i < rows.length - 1 ? "\n" : ""));
      });
    };

    const cleanup = (): void => {
      stdin.removeListener("data", onData);
      try {
        stdin.setRawMode(false);
      } catch {
        // ignore — best effort restore
      }
      stdin.pause();
      stdout.write(ANSI_SHOW_CURSOR + "\n");
    };

    const finish = (value: number | null): void => {
      cleanup();
      resolve(value);
    };

    let escTimer: NodeJS.Timeout | null = null;
    const onData = (chunk: string): void => {
      // Arrow keys arrive as "<ESC>[A" / "<ESC>[B" (sometimes split across chunks).
      if (chunk === ESC) {
        // Lone Esc (cancel) vs. prefix of an arrow sequence: wait briefly.
        if (escTimer) clearTimeout(escTimer);
        escTimer = setTimeout(() => finish(null), 60);
        return;
      }
      if (escTimer) {
        clearTimeout(escTimer);
        escTimer = null;
      }
      if (chunk === "[A" || chunk === `${ESC}[A`) {
        selected = (selected - 1 + options.length) % options.length;
        draw();
        return;
      }
      if (chunk === "[B" || chunk === `${ESC}[B`) {
        selected = (selected + 1) % options.length;
        draw();
        return;
      }
      if (chunk === "\r" || chunk === "\n") {
        finish(selected);
        return;
      }
      if (chunk === "\u0003") {
        // Ctrl+C
        cleanup();
        stdout.write("\n");
        process.exit(130);
      }
      // j/k + digits as handy shortcuts.
      if (chunk === "j") {
        selected = (selected + 1) % options.length;
        draw();
        return;
      }
      if (chunk === "k") {
        selected = (selected - 1 + options.length) % options.length;
        draw();
        return;
      }
      const n = Number(chunk.trim());
      if (chunk.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= options.length) {
        finish(n - 1);
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdout.write(ANSI_HIDE_CURSOR);
    stdin.on("data", onData);
    draw();
  });
}
