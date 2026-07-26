# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Keep dependency resolution independent from application source changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN --mount=type=cache,id=bballedu-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm install --filter nba-draft-sim-server... --frozen-lockfile

COPY shared ./shared
COPY server ./server
COPY scripts ./scripts

RUN pnpm --filter @nba-draft-sim/shared build \
    && pnpm --filter nba-draft-sim-server build
RUN pnpm --filter nba-draft-sim-server deploy --prod --legacy /prod

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /prod ./

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server/index.js"]
