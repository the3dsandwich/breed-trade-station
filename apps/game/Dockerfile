# Stage 1: Build the Vite app
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /app

# Copy files needed for install (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Copy package.json files for workspaces used in this build
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/game/package.json ./apps/game/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/game/ ./apps/game/

RUN pnpm --filter @bts/game build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/apps/game/dist /usr/share/nginx/html

EXPOSE 80
