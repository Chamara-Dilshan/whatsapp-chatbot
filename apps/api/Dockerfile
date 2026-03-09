FROM node:18-alpine

WORKDIR /app

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

# Prune dev dependencies
RUN pnpm prune --prod

WORKDIR /app/apps/api

# Run database migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
