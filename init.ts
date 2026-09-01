import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { configFilePath } from "./config";

// starterConfig is what `init` writes: the defaults a run would otherwise
// fall back to silently, populated and ready to edit rather than left for
// someone to hand-author from documentation alone.
const STARTER_CONFIG = `# scaffold-typescript-cli config file.
# Flags and environment variables (SCAFFOLD_TYPESCRIPT_CLI_<SETTING>) override
# whatever's set here — see 'scaffold-typescript-cli --help'.

verbose: false
`;

export async function writeStarterConfig(force: boolean, path = configFilePath()): Promise<string> {
  if (!force) {
    const exists = await stat(path).then(
      () => true,
      (err) => {
        if (err.code === "ENOENT") return false;
        throw err;
      },
    );
    if (exists) {
      throw new Error(`${path} already exists; pass --force to overwrite`);
    }
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, STARTER_CONFIG, { mode: 0o600 });
  return path;
}
