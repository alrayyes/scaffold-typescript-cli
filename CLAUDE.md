# scaffold-typescript-cli

A GitHub template repo, not a distributed tool. It's built from
`~/.config/claude/CLAUDE.md` and `~/.config/claude/rules/*.md` — read those
for the "why" behind everything below. This file only says what's specific
to this repo.

## What this is

The GitHub-native sibling of the Forgejo template at
`git.higherlearning.eu/alrayyes/scaffold-typescript-cli` (its issue #13).
Same chassis, prose tooling, docs and TypeScript/bun CLI as that template,
with the CI/release/dependency-bot layer swapped for GitHub-native tooling:
`.github/workflows/` instead of `.forgejo/workflows/`, release-please
instead of semantic-release, Dependabot instead of Renovate.

## Commands

```sh
bun install
bun test
bun run lint                # biome check ., bun run format to fix
bun run format:check        # bun run lint:md, lint:prose, lint:mechanics too
```

Full list and what each one does: [CONTRIBUTING.md](CONTRIBUTING.md).

## Gotchas

- **Branch protection is on** (`required_pull_request_reviews` with 0
  required approvals, `enforce_admins: false`, no required status checks) —
  real and free here since the repo is public, unlike a private repo on
  this account's plan. PR-only discipline is still enforced by whoever's
  committing, not the platform alone: a 0-approval requirement blocks a
  direct push to `main` but not a same-account self-merge.
- **Single `index.ts`, on purpose.** No build step, no framework, no
  `ts-node`/`tsx` — `bun run index.ts` runs it as it is. `index.test.ts`
  uses `bun:test` next to it. Don't reach for a `src/` tree or a bundler
  until a second concern justifies one.
- **Biome, not ESLint/Prettier, for JS/TS/JSON.** One tool, one
  `biome.json`, one pass. Prettier stays scoped to Markdown and YAML, the
  two formats Biome doesn't cover.
- **`LICENSE` is deliberately unpicked.** Don't default it to GPL-3.0 or
  anything else; that's a decision the project stamped from this template
  makes, not this template.
- **Dependabot, not Renovate** — GitHub-native, needs no bot collaborator
  granted: `.github/dependabot.yml` is enough on its own. It stays enabled
  from the start, same as any other repo on this account: public repos get
  unlimited Actions minutes, so there's no metering reason to turn it off,
  and a dependency bump that needs a config change on our side surfaces
  here instead of on day one of the first real project cloned from this
  template.
- **`config.ts`/`init.ts`/`firstRun.ts` are the `rules/cli.md` baseline,
  not scaffold-specific.** `--verbose` is the one setting that exists
  purely so flags-over-env-over-file-over-defaults precedence has
  something real to demonstrate — grow real settings on `Config` and keep
  the same layering rather than inventing a second configuration path.
- **The Docker image (`Dockerfile`) is a second install path, not the
  primary one, and single-stage on purpose** — there's no compiled
  artefact to discard a toolchain stage for, only devDependencies a
  `--production` install never pulls in. `release.yml`'s `docker-image` job
  pushes it to `ghcr.io` after a real release, authenticated with the
  workflow's own `GITHUB_TOKEN` — no separate registry secret to mint or
  rotate the way the Forgejo scaffold's `RELEASE_TOKEN` login needs.
- **`ci.yml`'s `docker-build` and `dockerfile` jobs run Docker directly on
  the `ubuntu-24.04` runner** — no daemon-discovery dance through
  `/proc/net/route` the way the Forgejo scaffold's docker-in-docker runner
  needs; GitHub's hosted runner ships Docker ready to use.
- **`CODECOV_TOKEN` isn't set on this repo yet.** `ci.yml`'s `test` job
  uploads coverage with `fail_ci_if_error: false` until Ryan signs into
  `codecov.io` and hands over a token (`gh secret set CODECOV_TOKEN --repo
alrayyes/scaffold-typescript-cli`) — flip that to `true` once it's real,
  per `skills/repo-creation`'s Codecov section.
