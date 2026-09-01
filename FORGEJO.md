# Hosting on Forgejo instead of GitHub

This template treats GitHub as the primary host by default: `release-please`
for releases, Dependabot for dependency updates, and `.github/workflows/*.yml`
for CI. If a project stamped from this template ends up hosted on
`git.higherlearning.eu` instead, here's what to swap in for each — the exact
reverse of what
[`GITHUB.md` on the Forgejo sibling](https://git.higherlearning.eu/alrayyes/scaffold-typescript-cli/src/branch/main/GITHUB.md)
documents.

## 1) Release automation: `release-please` → `semantic-release`

**Why:** `release-please` needs a GitHub App or a token that can open pull
requests against this repo — a natural fit for GitHub's own `GITHUB_TOKEN`,
not something Forgejo's Actions runner grants the same way. `semantic-release`
publishes the next version, changelog and Forgejo release directly on every
push to `main`, no release pull request involved.

Drop `release-please-config.json`, `.release-please-manifest.json`, and the
GHCR login/push steps in `release.yml`'s `docker-image` job. Add instead
`release.config.mjs`, `scripts/set-version.sh` and the
`semantic-release`/`@semantic-release/*`/`@ribbon-studios/semantic-release-forgejo`
devDependencies — see the Forgejo scaffold's own copies of those files for
the exact shape; they're the ones to restore.

`scripts/set-version.sh` exists because `@semantic-release/npm` (the plugin
that would otherwise bump `package.json`) shells out to `npm version`, and
this is a bun-only toolchain — writing the version field by hand avoids
pulling npm onto the runner for one line.

The Forgejo Actions runner injects `FORGEJO_TOKEN` into every job
automatically; `release.config.mjs` reads `RELEASE_TOKEN` from the
environment explicitly instead; passing the wrong credential would succeed
quietly rather than failing.

Check `git tag` before switching: `release-please`'s `include-v-in-tag: true`
tags with a `v` prefix (`v1.2.3`), which `semantic-release`'s default
`tagFormat` doesn't use (bare `1.2.3`). Reconcile that first or one tool
concludes there's never been a release.

## 2) Dependency updates: Dependabot → Renovate

**Why:** this account runs a single shared Renovate instance
(`alrayyes/renovate-runner`) across every Forgejo repo it has collaborator
access to — no per-repo config needed beyond adding the `renovatebot` account
as a collaborator with write access. Dependabot is GitHub-native and doesn't
reach Forgejo at all.

Delete `.github/dependabot.yml` and `.github/workflows/dependabot-auto-merge.yml`.
Add a `renovate.json` — see the Forgejo scaffold's own copy for the custom
manager that picks up the `# renovate: datasource=... depName=...` version
pins in `.forgejo/workflows/*.yml` and `scripts/lint-mechanics.sh`, since
Renovate's default managers don't look inside either.

`automerge: true` is Renovate's own config field, unlike Dependabot's
GitHub-Actions-driven workaround — no separate auto-merge workflow needed.

## 3) CI workflows: `.github/workflows/` → `.forgejo/workflows/`

The YAML shape carries over directly. What doesn't:

- **`runs-on: ubuntu-24.04` becomes `runs-on: docker` plus a container
  image.** This account's Forgejo runner has no hosted-VM equivalent —
  every job runs in an Alpine image you pick, usually `oven/bun`, `golang`
  or `hadolint`, with `git`/`nodejs`/`bash` installed by hand as the job
  needs them.
- **Fully qualified action refs.** `uses: actions/checkout@<sha>` becomes
  `uses: https://code.forgejo.org/actions/checkout@<sha>` — a bare ref
  doesn't resolve against Forgejo's own action mirror.
- **No Docker-in-Docker socket to bind-mount.** The `dockerfile` and
  `docker-build` jobs need the `/proc/net/route` gateway-discovery dance to
  reach the runner's sibling dind daemon over `DOCKER_HOST=tcp://...` — see
  the Forgejo scaffold's `ci.yml` for the exact script and why.
- **`FORGEJO_TOKEN`/secret names can't start with `GITHUB_`** — the inverse
  of GitHub reserving `GITHUB_`.
- **Pull request title enforcement has no dedicated action.** There's no
  Forgejo equivalent of `amannn/action-semantic-pull-request` — `pr-title.yml`
  instead pipes the pull request title straight through commitlint over
  stdin.
- **Branch protection is an owner-level web UI setting, not an API call.**
  `claude`'s branch-protection API access returns a 403 for anyone but the
  repo owner — ask Ryan to turn it on via `Settings → Branches` rather than
  scripting it, and check both the rule itself and the separate "Enable
  Push" toggle if a bot account (`release`) needs to push past it.

Translating `.github/workflows/ci.yml`, `gitleaks.yml` and `prose.yml`
job-for-job into `.forgejo/workflows/` is mechanical once those points are
accounted for — same jobs, same commands, Alpine containers with `apk add`
bootstrap steps instead of `ubuntu-24.04`'s preinstalled toolchain.
