// The one thing this template does: greet a name back. It exists so the
// whole chain — a script, its tests, the hooks, CI — has something real to
// run against. Replace this with your first real command.
//
// No build step: `bun run index.ts` runs this file as it is.
//
// It also reads the config file this template ships (config.ts), so the
// flags-over-env-over-file-over-defaults precedence has something real to
// observe: pass --verbose, set SCAFFOLD_TYPESCRIPT_CLI_VERBOSE, or write
// `verbose: true` to the config file and the extra detail below shows up
// the same way regardless of which layer set it.

import { Command } from "commander";
import { loadConfig } from "./config";
import { maybeOfferInit } from "./firstRun";
import { writeStarterConfig } from "./init";

export function greet(name: string, verbose = false): string {
  if (verbose) {
    return `hello, ${name}! (bun ${Bun.version}, ${process.platform}/${process.arch})`;
  }
  return `hello, ${name}!`;
}

export function parseName(argv: string[]): string {
  const flagIndex = argv.indexOf("--name");
  const value = flagIndex !== -1 ? argv[flagIndex + 1] : undefined;
  return value ?? "world";
}

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("scaffold-typescript-cli")
    .option("--name <name>", "name to greet", "world")
    .option("--verbose", "enable verbose output")
    .option("--no-verbose", "disable verbose output, overriding the environment or config file")
    .option("--api-token <token>", "example credential (prefer --api-token-command)")
    .option(
      "--api-token-command <command>",
      "command whose trimmed stdout is the credential; wins over --api-token",
    )
    .option("-y, --yes", "answer yes to the first-run config prompt without asking")
    .hook("preAction", async (thisCommand, actionCommand) => {
      // init has its own reason for existing; asking it to run itself first
      // would be silly, so every other command runs through this first-run
      // check instead.
      if (actionCommand.name() === "init") return;
      await maybeOfferInit(
        {
          stdin: process.stdin,
          stdout: process.stdout,
          stderr: process.stderr,
          isTerminal: Boolean(process.stdin.isTTY),
        },
        Boolean(thisCommand.opts().yes),
      );
    })
    .action(async (opts) => {
      const cfg = await loadConfig({
        verbose: opts.verbose as boolean | undefined,
        apiToken: opts.apiToken as string | undefined,
        apiTokenCommand: opts.apiTokenCommand as string | undefined,
      });
      console.log(greet(opts.name as string, cfg.verbose));
    });

  program
    .command("init")
    .description("Write a starter config file")
    .option("--force", "overwrite an existing config file")
    .action(async (opts) => {
      const path = await writeStarterConfig(Boolean(opts.force));
      console.log(`Wrote ${path}`);
    });

  return program;
}

if (import.meta.main) {
  await buildProgram().parseAsync(process.argv);
}
