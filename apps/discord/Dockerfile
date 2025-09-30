FROM oven/bun:1.1.8-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS build
WORKDIR /app
COPY package.json bun.lockb ./
COPY tsconfig.json ./
COPY src ./src
RUN bun install --frozen-lockfile
RUN bun run typecheck

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bunuser -u 1001

# Copy dependencies
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --chown=bunuser:nodejs package.json ./

# Copy source code
COPY --chown=bunuser:nodejs src ./src

# Switch to non-root user
USER bunuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD bun --version || exit 1

# Expose port (if needed for metrics/health endpoint)
EXPOSE 3000

# Start the application
CMD ["bun", "src/index.ts"]