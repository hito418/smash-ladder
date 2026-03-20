FROM node:23.7.0-alpine AS base

RUN npm install -g corepack@latest \
  && corepack enable \
  && corepack prepare pnpm@latest --activate

FROM base AS prune
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN pnpm add -g turbo@^2

COPY . .

RUN turbo prune "@repo/web" --docker

FROM base AS builder
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY --from=prune /app/out/json .
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=prune /app/out/full/ .
RUN pnpm turbo run build

FROM nginx:1.27.4-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
