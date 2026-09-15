/**
 * `wani setup` — interactive first-run menu.
 *
 * TTY only. Composes the existing commands (login → project → test →
 * current) so newcomers need no CLI knowledge:
 *
 *   Welcome to Wani
 *   1. Login
 *   2. Select project
 *   3. Test OTP
 *   4. View project
 *   5. Exit
 */
import { CliError } from "../api/errors.js";
import type { CommandContext } from "./context.js";
import type { ParsedArgs } from "../utils/args.js";
import { printLine } from "../output/human.js";
import { promptText } from "../utils/prompt.js";
import { loginCommand } from "./auth/login.js";
import { projectListCommand, fetchProjects } from "./project/list.js";
import { projectUseCommand } from "./project/use.js";
import { projectCurrentCommand } from "./project/current.js";
import { otpTestCommand } from "./otp/test.js";

export interface SetupDeps {
  prompt?: ((question: string) => Promise<string>) | undefined;
}

function emptyArgs(extraOptions?: Record<string, string | boolean>): ParsedArgs {
  return { command: ["setup"], positional: [], options: extraOptions ?? {} };
}

export async function setupCommand(
  ctx: CommandContext,
  args: ParsedArgs,
  deps?: SetupDeps
): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new CliError("`wani setup` needs an interactive terminal.", { kind: "usage" });
  }
  void args;
  const prompt = deps?.prompt ?? promptText;

  printLine("Welcome to Wani");
  for (;;) {
    printLine("");
    printLine("  1) Login");
    printLine("  2) Select project");
    printLine("  3) Test OTP");
    printLine("  4) View project");
    printLine("  5) Exit");
    const answer = (await prompt("Choose [1]: ")).trim();

    if (answer === "" || answer === "1") {
      await loginCommand(ctx, emptyArgs({ "no-open": false }));
    } else if (answer === "2") {
      await projectListCommand(ctx);
      const projects = await fetchProjects(ctx);
      if (projects.length === 0) {
        printLine("No projects found for this account.");
        continue;
      }
      const ref = (await prompt("Project id or name: ")).trim();
      if (!ref) continue;
      await projectUseCommand(ctx, {
        command: ["project", "use"],
        positional: [ref],
        options: {},
      });
    } else if (answer === "3") {
      await otpTestCommand(ctx, emptyArgs());
    } else if (answer === "4") {
      await projectCurrentCommand(ctx);
    } else if (answer === "5" || answer.toLowerCase() === "q" || answer.toLowerCase() === "exit") {
      printLine("Done. Run `wani --help` to see all commands.");
      return;
    } else {
      printLine("Pick a number between 1 and 5.");
    }
  }
}
