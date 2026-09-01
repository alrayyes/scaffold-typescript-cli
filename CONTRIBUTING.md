# Contributing

This file is for whoever changes this template. The [README](README.md) is
for whoever stamps a project out of it.

## Getting set up

- **[bun](https://bun.sh) 1.3 or newer.** Runtime, test runner, package
  manager for the linter, and the [lefthook](https://lefthook.dev) that
  runs the git hooks — bun is the only thing to install.
- **[Vale](https://vale.sh)** on your `PATH`, for the style tier of the
  prose lint:

  ```sh
  go install github.com/errata-ai/vale/v3/cmd/vale@latest
  ```

  `ltex-cli-plus` needs nothing installed: the hook fetches and caches it
  on first use.

One command installs the linter, the git hooks, and their dependencies:

```sh
bun install
```

An uninstalled hook silently does nothing, which is worse than not having
one, so the `prepare` script runs `lefthook install` for you. You find out
at the pipeline otherwise, not at the commit.

## Everyday commands

Every one of these is what a hook or CI runs — see `lefthook.yml` and
`.github/workflows/*.yml` for exactly which.

```sh
bun run start               # bun run index.ts
bun test
bun test --coverage         # bun writes the table to stderr, not stdout

bun run lint                # biome check ., the check-only form
bun run format               # biome check --write ., the fixer

bun run format:check        # prettier --check, add --write to fix
bun run lint:md
bun run lint:prose          # vale
bun run lint:mechanics      # ltex-cli-plus

hadolint Dockerfile
docker build -t scaffold-typescript-cli:local .
```

## How it fits together

One entry script, `index.ts`, run directly with `bun run index.ts` — no
build step, no framework, no `ts-node`/`tsx`. `index.test.ts` sits next to
it and uses `bun:test`.

`config.ts`, `init.ts` and `firstRun.ts` are `rules/cli.md`'s cross-language
CLI baseline, not scaffold-specific: `config.ts` layers commander's flags
over the environment over the config file over built-in defaults, `init.ts`
writes the starter config file, and `firstRun.ts` is the TTY-gated nudge
toward `init` on a genuinely unconfigured run — see its own doc comment for
why it checks a TTY before ever prompting. `--verbose` is the one setting
this template ships, purely so the precedence has something real to
demonstrate. A real project stamped from this template grows its own
settings on `Config` and keeps the same layering rather than inventing a
second configuration path.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): description`, types `feat`/`fix`/`docs`/`style`/`refactor`/
`perf`/`test`/`build`/`ci`/`chore`/`revert`. Subject under 50 characters,
lowercase, no trailing full stop. commitlint enforces the shape at
commit-msg and again in CI; the length and case rules are tighter than what
it checks, so hold to them anyway.

## Branching, review, and release

Every change goes through a pull request — nothing is pushed straight to
`main`, including the bootstrapping that built this repo. Branch protection
is on (`Settings → Branches → main`): a pull request is required, though no
approval count is enforced mechanically, so PR-only discipline still comes
down to whoever's committing rather than the platform alone.

The pull request **title** has to be a valid Conventional Commit too —
`pr-title.yml` checks it. commitlint only ever reads commit objects, and a
squash merge defaults its commit message to the pull request title, so this
is the only check standing between a badly titled pull request and a bad
message on `main`.

Once a pull request's checks are green, squash-merge it and delete the
branch. [release-please](https://github.com/googleapis/release-please)
reads the Conventional Commits on `main` and keeps a release pull request
open with the next version and changelog entry; merging that one tags the
release and publishes the Docker image to `ghcr.io`. Nobody picks a version
by hand.
