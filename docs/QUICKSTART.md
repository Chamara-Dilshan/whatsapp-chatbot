# 🚀 Quick Start Guide

Get the WhatsApp Business Support Bot running in 5 minutes!

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker (runs PostgreSQL + Redis)

## Start in 4 Steps

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Database & Redis
```bash
docker-compose up -d
```

This starts PostgreSQL (port 5433) and Redis (port 6379). Both are required.

### 3. Setup Database
```bash
cd apps/api
pnpm prisma db push
pnpm prisma db seed
cd ../..
```

### 4. Start Services

**Terminal 1 - API:**
```bash
cd apps/api && pnpm dev
```

**Terminal 2 - Dashboard:**
```bash
cd apps/dashboard && pnpm dev
```

## Access

- **Dashboard:** http://localhost:3001
- **API:** http://localhost:4000
- **Register a new account:** http://localhost:3001/register
- **Login (demo):** owner@acme.test / password123

## That's It! 🎉

For detailed instructions, see [RUNNING.md](RUNNING.md)

## Common Issues

**Port in use?**
```bash
# Kill process on port 4000 (API)
taskkill /PID $(netstat -ano | findstr :4000 | awk '{print $5}') /F

# Kill process on port 3001 (Dashboard)
taskkill /PID $(netstat -ano | findstr :3001 | awk '{print $5}') /F
```

**Database won't connect?**
```bash
docker-compose down && docker-compose up -d
```

**Redis not running?**
```bash
docker-compose up -d redis
# or restart all:
docker-compose down && docker-compose up -d
```

**Need to reset everything?**
```bash
cd apps/api
pnpm prisma db push --force-reset
pnpm prisma db seed
```
