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
}

const ENV_PREFIX = "SCAFFOLD_TYPESCRIPT_CLI";

export const VERBOSE_ENV_VAR = `${ENV_PREFIX}_VERBOSE`;

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

async function readConfigFile(): Promise<Partial<Config>> {
  const explorer = cosmiconfig("scaffold-typescript-cli");
  try {
    const result = await explorer.load(configFilePath());
    return (result?.config as Partial<Config>) ?? {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

// loadConfig takes flagVerbose as `undefined` when the flag was never
// passed (see index.ts's --verbose/--no-verbose pair) so the environment
// and file layers below it get a chance to apply — a flag whose commander
// default were `false` would look identical to "not passed" and clobber
// both.
export async function loadConfig(flagVerbose: boolean | undefined): Promise<Config> {
  if (flagVerbose !== undefined) return { verbose: flagVerbose };

  const envValue = process.env[VERBOSE_ENV_VAR];
  if (envValue !== undefined) return { verbose: parseBoolEnv(envValue) };

  const fileConfig = await readConfigFile();
  if (fileConfig.verbose !== undefined) return { verbose: Boolean(fileConfig.verbose) };

  return { verbose: false };
}
