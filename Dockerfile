# No build step: this tool runs its TypeScript directly, the same way
# `bun run index.ts` does outside a container — so, unlike a compiled
# language's Dockerfile, there's no toolchain stage to discard, only
# devDependencies (biome, lefthook, semantic-release, ...) this stage never
# installs in the first place.
FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f

WORKDIR /app

COPY package.json bun.lock ./
# --ignore-scripts: the "prepare" script runs `lefthook install`, a
# devDependency this --production install never brings in — there's no git
# repo in this image for a git hook to attach to anyway.
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY index.ts config.ts init.ts firstRun.ts ./

# The base image already ships a non-root `bun` user; this is explicit
# rather than load-bearing, the same reasoning as scaffold-go-cli's Dockerfile.
USER bun

# No CMD: `docker run <image> <args>` reaches the CLI's own subcommands
# directly, the same shape as running the script itself.
ENTRYPOINT ["bun", "run", "index.ts"]
