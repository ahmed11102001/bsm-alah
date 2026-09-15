/**
 * Interactive stdin prompts (no runtime dependencies).
 * Password input hides typed characters (prints `*`).
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
