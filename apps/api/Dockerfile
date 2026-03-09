FROM node:18-alpine

WORKDIR /app

# Install OpenSSL (required by Prisma migration engine on Alpine)
RUN apk add --no-cache openssl libc6-compat

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy packages
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @whatsapp-bot/api exec prisma generate

# Build shared package first, then API
RUN pnpm --filter @whatsapp-bot/shared build
RUN pnpm --filter @whatsapp-bot/api build

# Verify build output exists (fails build if dist/server.js missing)
RUN ls -la /app/apps/api/dist/server.js

WORKDIR /app/apps/api

# Run database migrations then start (use direct path for prisma)
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy && node dist/server.js"]
