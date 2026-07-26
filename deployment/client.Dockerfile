# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Keep dependency resolution independent from application source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN --mount=type=cache,id=bballedu-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm install --filter nba-draft-sim-client... --frozen-lockfile

COPY shared ./shared
COPY client ./client

ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL="${VITE_API_URL}"
RUN pnpm --filter @nba-draft-sim/shared build \
    && pnpm --filter nba-draft-sim-client build

FROM nginx:alpine AS runtime

WORKDIR /usr/share/nginx/html

RUN rm -f /etc/nginx/conf.d/default.conf
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist ./

RUN addgroup -g 1001 -S nginx-user \
    && adduser -S nginx-user -u 1001 \
    && chown -R nginx-user:nginx-user /usr/share/nginx/html \
    && chown -R nginx-user:nginx-user /var/cache/nginx \
    && chown -R nginx-user:nginx-user /var/log/nginx \
    && chown -R nginx-user:nginx-user /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
