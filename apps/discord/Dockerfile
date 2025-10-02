FROM oven/bun:latest AS base
WORKDIR /project-lol-discord

# Install turbo globally
RUN bun add -g turbo

FROM base AS pruner
WORKDIR /project-lol-discord

# Copy entire monorepo
COPY . .

# Prune to only discord workspace
RUN turbo prune @project-lol/discord --docker

# Install all dependencies to root node_modules
RUN bun install --production

FROM oven/bun:latest AS installer
WORKDIR /project-lol-discord

# Copy pruned workspace
COPY --from=pruner /project-lol-discord/out/json/ .

# Install dependencies (regenerate lockfile for catalog: dependencies)
RUN bun install

# Copy source files
COPY --from=pruner /project-lol-discord/out/full/ .

FROM oven/bun:alpine AS runtime
WORKDIR /project-lol-discord

# Copy installed dependencies and source
COPY --from=installer /project-lol-discord .

WORKDIR /project-lol-discord/apps/discord
CMD ["bun", "src/index.ts"]