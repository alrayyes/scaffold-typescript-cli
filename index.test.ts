import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configFilePath, loadConfig, VERBOSE_ENV_VAR } from "./config";
import { greet } from "./index";
import { writeStarterConfig } from "./init";

describe("greet", () => {
  test("wraps a name in a greeting", () => {
    expect(greet("Ada")).toBe("hello, Ada!");
  });

  test("adds build detail when verbose", () => {
    expect(greet("Ada", true)).toContain("hello, Ada! (bun");
  });
});

describe("loadConfig", () => {
  let originalConfigHome: string | undefined;
  let originalVerboseEnv: string | undefined;

  beforeEach(() => {
    originalConfigHome = process.env.XDG_CONFIG_HOME;
    originalVerboseEnv = process.env[VERBOSE_ENV_VAR];
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-"));
    delete process.env[VERBOSE_ENV_VAR];
  });

  afterEach(() => {
    if (originalConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalConfigHome;
    if (originalVerboseEnv === undefined) delete process.env[VERBOSE_ENV_VAR];
    else process.env[VERBOSE_ENV_VAR] = originalVerboseEnv;
  });

  test("defaults to false with nothing set", async () => {
    expect((await loadConfig(undefined)).verbose).toBe(false);
  });

  test("reads the config file when no flag or env var overrides it", async () => {
    await writeStarterConfig(false);
    const path = configFilePath();
    await Bun.write(path, "verbose: true\n");

    expect((await loadConfig(undefined)).verbose).toBe(true);
  });

  test("the environment overrides the config file", async () => {
    await Bun.write(configFilePath(), "verbose: true\n", { createPath: true });
    process.env[VERBOSE_ENV_VAR] = "false";

    expect((await loadConfig(undefined)).verbose).toBe(false);
  });

  test("the flag overrides the environment", async () => {
    process.env[VERBOSE_ENV_VAR] = "true";

    expect((await loadConfig(false)).verbose).toBe(false);
  });
});

describe("writeStarterConfig", () => {
  let originalConfigHome: string | undefined;

  beforeEach(() => {
    originalConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-"));
  });

  afterEach(() => {
    if (originalConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalConfigHome;
  });

  test("writes a starter config file", async () => {
    const path = await writeStarterConfig(false);

    expect(readFileSync(path, "utf8")).toContain("verbose: false");
  });

  test("refuses to overwrite an existing file without force", async () => {
    const path = await writeStarterConfig(false);
    await Bun.write(path, "verbose: true\n");

    await expect(writeStarterConfig(false)).rejects.toThrow("already exists");
  });

  test("force overwrites an existing file", async () => {
    const path = await writeStarterConfig(false);
    await Bun.write(path, "verbose: true\n");

    await writeStarterConfig(true);

    expect(readFileSync(path, "utf8")).toContain("verbose: false");
  });
});

describe("CLI", () => {
  function runCli(args: string[], env: Record<string, string> = {}) {
    return Bun.spawnSync(["bun", "run", "index.ts", ...args], {
      cwd: import.meta.dir,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-")),
        ...env,
      },
    });
  }

  test("prints the greeting for the given name, run directly with no build step", () => {
    const result = runCli(["--name", "Ada"]);

    expect(result.stdout.toString().trim()).toBe("hello, Ada!");
  });

  test("--verbose adds build detail", () => {
    const result = runCli(["--verbose", "--name", "Ada"]);

    expect(result.stdout.toString()).toContain("hello, Ada! (bun");
  });

  test("--no-verbose overrides a truthy environment variable", () => {
    const result = runCli(["--no-verbose", "--name", "Ada"], { [VERBOSE_ENV_VAR]: "true" });

    expect(result.stdout.toString().trim()).toBe("hello, Ada!");
  });

  test("a genuinely unconfigured, non-interactive run warns on stderr", () => {
    const result = runCli(["--name", "Ada"]);

    expect(result.stderr.toString()).toContain("scaffold-typescript-cli init");
  });

  test("an existing config file skips the first-run warning", () => {
    const configHome = mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-"));
    Bun.spawnSync(["bun", "run", "index.ts", "init"], {
      cwd: import.meta.dir,
      env: { ...process.env, XDG_CONFIG_HOME: configHome },
    });

    const result = runCli(["--name", "Ada"], { XDG_CONFIG_HOME: configHome });

    expect(result.stderr.toString()).toBe("");
  });

  test("init writes a starter config file", () => {
    const configHome = mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-"));

    const result = runCli(["init"], { XDG_CONFIG_HOME: configHome });

    expect(result.stdout.toString()).toContain("Wrote");
    expect(existsSync(join(configHome, "scaffold-typescript-cli", "config.yaml"))).toBe(true);
  });

  test("init refuses to overwrite an existing config file", () => {
    const configHome = mkdtempSync(join(tmpdir(), "scaffold-typescript-cli-test-"));
    runCli(["init"], { XDG_CONFIG_HOME: configHome });

    const result = runCli(["init"], { XDG_CONFIG_HOME: configHome });

    expect(result.stderr.toString()).toContain("already exists");
  });

  test("--yes writes the config file without prompting", () => {
    const result = runCli(["--yes", "--name", "Ada"]);

    expect(result.stdout.toString()).toContain("Wrote");
  });
});
