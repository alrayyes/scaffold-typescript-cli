// Every setting this tool resolves from flags, the environment and the
// config file, in that order — flags override environment variables
// override the config file override built-in defaults, per cli.md.
//
// commander handles the flag layer itself (see index.ts); this module is
// the environment and config-file layers plus the merge between all three.

import { cosmiconfig } from "cosmiconfig";
import envPaths from "env-paths";

export interface Config {
  verbose: boolean;
  // apiToken is the scaffold's example credential field: a stand-in for
  // whatever real secret a project built from this template ends up
  // needing. It demonstrates the <field>/<field>_command pattern from
  // cli.md's "Secrets get a command option, not just a value" — delete it
  // once a real credential takes its place.
  apiToken: string | undefined;
}

export interface ConfigFlags {
  verbose: boolean | undefined;
  apiToken: string | undefined;
  apiTokenCommand: string | undefined;
}

const ENV_PREFIX = "SCAFFOLD_TYPESCRIPT_CLI";

export const VERBOSE_ENV_VAR = `${ENV_PREFIX}_VERBOSE`;
export const API_TOKEN_ENV_VAR = `${ENV_PREFIX}_API_TOKEN`;
export const API_TOKEN_COMMAND_ENV_VAR = `${ENV_PREFIX}_API_TOKEN_COMMAND`;

interface FileConfig {
  verbose?: boolean;
  api_token?: string;
  api_token_command?: string;
}

// No suffix: env-paths appends "-nodejs" by default to dodge collisions
// with a same-named tool in another language, which is exactly the
// XDG_CONFIG_HOME/<name> path cli.md asks for, not XDG_CONFIG_HOME/<name>-nodejs.
export function configFilePath(): string {
  return `${envPaths("scaffold-typescript-cli", { suffix: "" }).config}/config.yaml`;
}

function parseBoolEnv(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no", ""].includes(normalized)) return false;
  throw new Error(`invalid boolean in ${VERBOSE_ENV_VAR}: "${raw}"`);
}

async function readConfigFile(): Promise<FileConfig> {
  const explorer = cosmiconfig("scaffold-typescript-cli");
  try {
    const result = await explorer.load(configFilePath());
    return (result?.config as FileConfig) ?? {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  return values.find((value) => value !== undefined);
}

function trimOneTrailingNewline(text: string): string {
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

// resolveSecret is rules/cli.md's "Secrets get a command option, not just a
// value": a command sibling wins over a literal when both are set, its
// stdout is run through the shell and trimmed of exactly one trailing
// newline, and a non-zero exit is a hard error — never a silent fall-back
// to an empty credential.
export async function resolveSecret(
  literal: string | undefined,
  command: string | undefined,
): Promise<string | undefined> {
  if (command === undefined || command === "") return literal;

  const proc = Bun.spawn(["/bin/sh", "-c", command], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `command "${command}" exited ${exitCode}: ${stderr.trim() || "(no output on stderr)"}`,
    );
  }

  return trimOneTrailingNewline(stdout);
}

// loadConfig takes each flag as `undefined` when it was never passed (see
// index.ts's option definitions) so the environment and file layers below
// it get a chance to apply — a flag whose commander default were set would
// look identical to "not passed" and clobber both.
export async function loadConfig(flags: ConfigFlags): Promise<Config> {
  const fileConfig = await readConfigFile();

  const verbose = firstDefined(
    flags.verbose,
    process.env[VERBOSE_ENV_VAR] === undefined
      ? undefined
      : parseBoolEnv(process.env[VERBOSE_ENV_VAR] as string),
    fileConfig.verbose === undefined ? undefined : Boolean(fileConfig.verbose),
  );

  const apiTokenLiteral = firstDefined(
    flags.apiToken,
    process.env[API_TOKEN_ENV_VAR],
    fileConfig.api_token,
  );
  const apiTokenCommand = firstDefined(
    flags.apiTokenCommand,
    process.env[API_TOKEN_COMMAND_ENV_VAR],
    fileConfig.api_token_command,
  );

  return {
    verbose: verbose ?? false,
    apiToken: await resolveSecret(apiTokenLiteral, apiTokenCommand),
  };
}
