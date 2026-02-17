# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy packages
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @whatsapp-bot/api exec prisma generate

# Build shared package first, then API
RUN pnpm --filter @whatsapp-bot/shared build
RUN pnpm --filter @whatsapp-bot/api build

# ── Stage 2: Runner ───────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@8

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy source for Prisma
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma/ ./apps/api/prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

# Run database migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
