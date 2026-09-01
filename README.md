# scaffold-typescript-cli

[![CI](https://github.com/alrayyes/scaffold-typescript-cli/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alrayyes/scaffold-typescript-cli/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/alrayyes/scaffold-typescript-cli/graph/badge.svg)](https://codecov.io/gh/alrayyes/scaffold-typescript-cli)
[![release](https://img.shields.io/github/v/release/alrayyes/scaffold-typescript-cli?sort=semver)](https://github.com/alrayyes/scaffold-typescript-cli/releases/latest)
[![licence](https://img.shields.io/badge/licence-unlicensed-lightgrey)](LICENSE)

A GitHub template for a TypeScript/bun command-line tool. Run `gh repo
create my-real-project --template alrayyes/scaffold-typescript-cli` and you
get a project with the conventions already wired in — pinned tooling, Biome
linting, prose linting, secret scanning, and release automation — rather
than a blank directory and a checklist to work through by hand.

It isn't a tool on its own. The one thing it does, greet a name back,
exists so the whole chain — the script, its tests, hooks, CI — has
something real to run against. Replace it with your first real command and
delete this paragraph.

## Requirements

- **[bun](https://bun.sh) 1.3 or newer.** It's the runtime, the test
  runner, the package manager for the linter, and the
  [lefthook](https://lefthook.dev) that runs the git hooks — nothing else
  to install.
- No external services. Configuration is optional — see Usage below.

## Installation

```sh
git clone https://github.com/alrayyes/scaffold-typescript-cli.git
cd scaffold-typescript-cli
bun install
```

## Usage

```sh
bun run index.ts --name Ada
bun run index.ts
```

No build step: `index.ts` runs as it is, directly.

A run with no config file yet offers to create one — answer no, or run
non-interactively (CI, a script, a pipe), and it just runs on defaults.
`init` writes the starter file directly:

```sh
bun run index.ts init
```

Every setting takes a flag, an environment variable
(`SCAFFOLD_TYPESCRIPT_CLI_<SETTING>`), or a line in the config file
(`$XDG_CONFIG_HOME/scaffold-typescript-cli/config.yaml`, usually
`~/.config/scaffold-typescript-cli/config.yaml`) — in that order of
precedence. `--verbose` / `SCAFFOLD_TYPESCRIPT_CLI_VERBOSE` / `verbose:
true` all do the same thing; `--no-verbose` overrides either of the other
two back off.

`api_token` is this scaffold's example credential field, and it takes two
forms — the literal value, and a sibling field, `api_token_command`, that
runs a command and uses its trimmed stdout instead:

```yaml
# literal, in config.yaml — fine for something that isn't actually secret
api_token: a-plain-value

# or piped through a command — the way an actual secret should be handled
api_token_command: hush-hush get scaffold-typescript-cli-api-token
```

The same pair works as flags (`--api-token`, `--api-token-command`) or
environment variables (`SCAFFOLD_TYPESCRIPT_CLI_API_TOKEN`,
`SCAFFOLD_TYPESCRIPT_CLI_API_TOKEN_COMMAND`). If both forms are set, the
command wins. The command runs through the shell, so a pipeline works
unmodified; a non-zero exit is a hard error rather than a silent empty
credential. `init` never writes a literal secret into the config it
generates — the starter file leaves `api_token_command` commented out as an
example instead.

A Docker image ships alongside the script — no bun install needed:

```sh
docker run --rm ghcr.io/alrayyes/scaffold-typescript-cli:latest --name Ada
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the toolchain, the hooks, and how
a change gets reviewed and released.

## Licence

No licence has been chosen yet — see [`LICENSE`](LICENSE). Pick one before a
project stamped from this template goes anywhere public.
