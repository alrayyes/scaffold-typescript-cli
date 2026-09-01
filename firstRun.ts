import { stat } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { configFilePath, VERBOSE_ENV_VAR } from "./config";
import { writeStarterConfig } from "./init";

export interface FirstRunIO {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
  isTerminal: boolean;
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    },
  );
}

// maybeOfferInit runs once per invocation, before any command's own logic:
// a genuinely unconfigured first run — no config file, no relevant
// environment variable set — is exactly the moment someone needs pointing
// at `init`, not left to find it in --help. Once a config file exists, or
// the environment already covers every setting init would write, it does
// nothing.
export async function maybeOfferInit(io: FirstRunIO, skipPrompt: boolean): Promise<void> {
  const path = configFilePath();

  if (await exists(path)) return; // this is a first-run prompt, not a nag on every invocation.
  if (process.env[VERBOSE_ENV_VAR] !== undefined) return;

  if (skipPrompt) {
    const written = await writeStarterConfig(false, path);
    io.stdout.write(`Wrote ${written}\n`);
    return;
  }

  if (!io.isTerminal) {
    io.stderr.write(
      `no config file found at ${path}; run \`scaffold-typescript-cli init\` to create one, or pass --yes to create it now. Continuing with defaults.\n`,
    );
    return;
  }

  io.stdout.write(`No config file found at ${path}.\nRun \`init\` now? [y/N] `);

  const rl = createInterface({ input: io.stdin, terminal: false });
  let answer = "";
  for await (const line of rl) {
    answer = line;
    break;
  }
  rl.close();

  if (answer.trim().toLowerCase() === "y") {
    const written = await writeStarterConfig(false, path);
    io.stdout.write(`Wrote ${written}\n`);
  }
}
