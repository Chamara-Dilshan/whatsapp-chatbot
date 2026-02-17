# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@8

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @whatsapp-bot/shared build

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @whatsapp-bot/dashboard build

# ── Stage 2: Runner ───────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@8

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN pnpm install --frozen-lockfile --prod

# Copy Next.js build output
COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public

WORKDIR /app/apps/dashboard

EXPOSE 3001
CMD ["pnpm", "start"]
