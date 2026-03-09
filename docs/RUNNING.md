# How to Run the WhatsApp Business Support Bot

This guide provides step-by-step instructions to run the complete WhatsApp Business Support Bot system locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** v8 or higher (install with `npm install -g pnpm`)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Git** (for version control)

## 🚀 Quick Start

### 1. Clone the Repository (if not already done)

```bash
git clone <repository-url>
cd whatsapp-chatbot
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo (API, Dashboard, and Shared packages).

### 3. Configure Environment Variables

The `.env` file is already configured for local development. Verify it contains:

```env
# Database
DATABASE_URL=postgresql://whatsapp_bot:localdev@localhost:5433/whatsapp_bot
DB_USER=whatsapp_bot
DB_PASSWORD=localdev
DB_NAME=whatsapp_bot
DB_PORT=5433

# API
API_PORT=4000
NODE_ENV=development

# Auth
JWT_SECRET=dev-jwt-secret-change-in-production-min-16-chars
JWT_REFRESH_SECRET=dev-refresh-secret-different-from-jwt-secret

# Encryption (32-byte hex key for AES-256-GCM)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# WhatsApp
WEBHOOK_VERIFY_TOKEN=my-webhook-verify-token

# Redis (required for webhook queue + cache)
REDIS_URL=redis://localhost:6379

# n8n Automation (optional)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/whatsapp-events
AUTOMATION_API_KEY=dev-automation-api-key-change-me

# Stripe Billing (optional for local dev — leave as placeholders)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_PRO=price_placeholder_pro
STRIPE_PRICE_ID_BUSINESS=price_placeholder_business
DASHBOARD_URL=http://localhost:3001

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**⚠️ IMPORTANT:** These are development credentials. **Never use these in production!**

### 4. Start PostgreSQL Database and Redis

Start both database services using Docker Compose:

```bash
docker-compose up -d
```

Verify they're running:

```bash
docker ps
```

You should see `whatsapp-bot-db` (PostgreSQL on port 5433) and `whatsapp-bot-redis` (Redis on port 6379) containers running.

> **Redis is required** for the webhook processing queue (BullMQ) and the cache layer. The API will fail to start if Redis is unreachable.

### 5. Setup Database Schema & Seed Data

```bash
# Navigate to API directory
cd apps/api

# Push schema to database
pnpm prisma db push

# Seed demo data
pnpm prisma db seed

# Create search indexes (required for product search)
docker exec whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX IF NOT EXISTS \"Product_name_trgm_idx\" ON \"Product\" USING GIN (\"name\" gin_trgm_ops); CREATE INDEX IF NOT EXISTS \"Product_description_trgm_idx\" ON \"Product\" USING GIN (\"description\" gin_trgm_ops);"

# Return to root
cd ../..
```

**What gets seeded:**
- ✅ 1 Demo tenant: "Acme Store" (with FREE plan subscription)
- ✅ 2 Users: Owner and Agent
- ✅ 10 Sample products
- ✅ 24 Reply templates (EN + Sinhala, 12 intents × FRIENDLY tone)
- ✅ WhatsApp connection configuration
- ✅ Tenant policies (defaultLanguage: EN, tone: FRIENDLY)

### 6. Start the API Server

**Option A: From root directory**
```bash
cd apps/api
pnpm dev
```

**Option B: Using workspace**
```bash
pnpm --filter @whatsapp-bot/api dev
```

The API will start on **http://localhost:4000**

You should see:
```
API server running on http://localhost:4000
Environment: development
Starting automation dispatcher
BullMQ webhook worker started
```

**Keep this terminal open.**

### 7. Start the Dashboard

Open a **new terminal** and run:

```bash
cd apps/dashboard
pnpm dev
```

The dashboard will start on **http://localhost:3001**

You should see:
```
▲ Next.js 14.2.35
- Local:        http://localhost:3001
✓ Ready in 3s
```

**Keep this terminal open.**

## 🎉 Access the Application

### Dashboard (Web UI)

1. Open your browser and navigate to: **http://localhost:3001**
2. You'll be redirected to the login page
3. Login with demo credentials:
   - **Email:** `owner@acme.test`
   - **Password:** `password123`

### Available Pages

- **Inbox** (`/dashboard/inbox`) - View and manage customer conversations
- **Cases** (`/dashboard/cases`) - Support case management with SLA tracking
- **Products** (`/dashboard/products`) - Product catalog management
- **Orders** (`/dashboard/orders`) - Order management and shipment tracking
- **Analytics** (`/dashboard/analytics`) - View metrics, SLA, and performance
- **Billing** (`/dashboard/billing`) - Subscription plans and usage
- **Team** (`/dashboard/team`) - Team member management (add/edit/deactivate agents)
- **Settings** (`/dashboard/settings`) - WhatsApp config, policies, templates, language & tone

### API Endpoints

The API is available at **http://localhost:4000**

**Health Check:**
```bash
curl http://localhost:4000/health
```

**Login (Get JWT Token):**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@acme.test","password":"password123"}'
```

**API Documentation:**
- Inbox: `GET /inbox`
- Cases: `GET /cases`
- Orders: `GET /orders`
- Analytics: `GET /analytics/overview`
- Billing: `GET /billing/subscription`
- Team: `GET /team`
- See `CLAUDE.md` for the complete API reference

## 🔍 Verify Everything Works

### 1. Check Services Status

```bash
# Check database
docker ps | grep whatsapp-bot-db

# Check API health
curl http://localhost:4000/health
# Expected: {"status":"ok"}

# Check if automation dispatcher is running
# Look for log message: "Starting automation dispatcher"
```

### 2. Test Login

1. Go to http://localhost:3001
2. Login with `owner@acme.test` / `password123`
3. You should see the inbox page

### 3. Check Database

```bash
# Connect to database
docker exec -it whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot

# View tables
\dt

# Query demo data
SELECT * FROM "Tenant";
SELECT * FROM "TenantUser";
SELECT * FROM "Product" LIMIT 5;

# Exit
\q
```

## 📦 What's Running

When everything is started, you should have:

| Service | Port | URL | Status |
|---------|------|-----|--------|
| PostgreSQL | 5433 | localhost:5433 | ✅ |
| Redis | 6379 | localhost:6379 | ✅ |
| API Server | 4000 | http://localhost:4000 | ✅ |
| Dashboard | 3001 | http://localhost:3001 | ✅ |
| Automation Dispatcher | - | (background process in API) | ✅ |
| BullMQ Webhook Worker | - | (background process in API) | ✅ |

## 🛑 Stop the Application

### Stop API & Dashboard

In each terminal, press `Ctrl + C`

### Stop Database

```bash
docker-compose down
```

### Stop Everything (including data cleanup)

```bash
docker-compose down -v
```

**⚠️ Warning:** `-v` flag will delete all database data!

## 🔧 Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::<port>`

**Solution:**

```bash
# For API (port 4000)
# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:4000 | xargs kill -9

# For Dashboard (port 3001)
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**

```bash
# Check if Docker is running
docker ps

# Restart database
docker-compose down
docker-compose up -d

# Wait 5 seconds, then try again
```

### Prisma Schema Issues

**Error:** Migration or schema errors

**Solution:**

```bash
cd apps/api

# Force reset and resync
pnpm prisma db push --force-reset

# Reseed
pnpm prisma db seed
```

### Dashboard Won't Start

**Error:** `next.config.ts not supported`

**Solution:** The project should have `next.config.mjs`. If you see this error:

```bash
cd apps/dashboard
rm next.config.ts  # if exists
# next.config.mjs should already exist
pnpm dev
```

### Login Fails

**Issue:** Invalid credentials or 401 error

**Solution:**

```bash
# Verify user exists
docker exec -it whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot -c "SELECT email FROM \"TenantUser\";"

# If no users, reseed
cd apps/api
pnpm prisma db seed
```

## 🔐 Demo Credentials

The seeded database includes:

**Owner Account:**
- Email: `owner@acme.test`
- Password: `password123`
- Role: `owner`

**Agent Account:**
- Email: `agent@acme.test`
- Password: `password123`
- Role: `agent`

## 📚 Next Steps

### Explore the Features

1. **Inbox Management**
   - View conversations
   - Assign to agents
   - Send replies
   - Close conversations

2. **Analytics Dashboard**
   - Overview metrics
   - Intent distribution
   - Agent performance
   - SLA compliance

3. **Case Management**
   - View cases via API
   - Track SLA deadlines
   - Monitor resolution times

4. **Team Management**
   - Add agents and admins
   - Edit roles and deactivate members
   - Monitor team capacity vs. plan limits

### Set Up n8n Automation (Optional)

Follow the guides in:
- `docs/N8N_WORKFLOWS.md` — case, SLA, and alert workflows
- `docs/N8N_ORDER_DELIVERED_WORKFLOW.md` — post-delivery feedback workflow

### Configure WhatsApp (For Production)

1. Get WhatsApp Business API credentials from Meta Business Manager
2. Update tenant WhatsApp settings via API (`POST /tenant/whatsapp/connect`)
3. Configure webhook URL in Meta to point to your API
4. Test with real WhatsApp messages

### Set Up Billing (Optional)

1. Create a Stripe account and add your PRO/BUSINESS plan products
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` in `.env`
3. Register your `POST /billing/stripe-webhook` endpoint in Stripe Dashboard → Webhooks
4. Test with Stripe's test mode

### Read Documentation

- **Environment Keys:** `docs/ENV_KEYS_GUIDE.md`
- **n8n Workflows:** `docs/N8N_WORKFLOWS.md`
- **Order Delivered Workflow:** `docs/N8N_ORDER_DELIVERED_WORKFLOW.md`
- **User Manual:** `docs/USER_MANUAL.md`
- **Project Plan:** `PLAN.md`

## 🏗️ Development Workflow

### Making Changes

**API Changes:**
```bash
cd apps/api
pnpm dev  # Auto-reloads on file changes
```

**Dashboard Changes:**
```bash
cd apps/dashboard
pnpm dev  # Auto-reloads on file changes
```

**Schema Changes:**
```bash
cd apps/api
# Edit prisma/schema.prisma
pnpm prisma db push
pnpm prisma generate
```

### Run Type Checking

```bash
# Check all workspaces
pnpm typecheck

# Or individual packages
cd apps/api && pnpm typecheck
cd apps/dashboard && pnpm typecheck
```

### View Logs

**API Logs:** Displayed in the terminal running `pnpm dev`

**Database Logs:**
```bash
docker logs whatsapp-bot-db -f
```

**Automation Dispatcher:** Check API logs for messages like:
```
Processing pending automation events
```

**BullMQ Worker:** Check API logs for:
```
BullMQ webhook worker started
```

## 🧪 E2E Tests (Playwright)

The project has a complete Playwright test suite covering all 8 dashboard pages (84 tests).

### Prerequisites

Both the API (:4000) and Dashboard (:3001) must be running, and demo data must be seeded (steps 4–7 above).

### Install Playwright browser (first time only)

```bash
pnpm exec playwright install chromium
```

### Run the full suite

```bash
pnpm test:e2e
```

All 84 tests run serially (1 worker) to stay within the API's 100 req/min rate limit. Expected runtime: ~1–2 minutes.

### Other test commands

```bash
pnpm test:e2e:headed      # Watch tests run in a visible browser
pnpm test:e2e:ui          # Playwright interactive UI mode
pnpm test:e2e:report      # Open the last HTML report
```

### How auth works in tests

Tests never hit the real login endpoint. `e2e/global-setup.ts` mints JWTs directly (signs with `JWT_SECRET`), caches them to `e2e/.auth-tokens.json` (gitignored), and each test fixture injects the token into `localStorage` via `page.addInitScript`. All high-volume API endpoints are intercepted with `page.route()` mocks so the rate limiter is never exhausted:

| Mocked endpoint(s) | Reason |
|--------------------|--------|
| `GET /auth/me` | Avoids real auth checks on every navigation |
| `GET /analytics/overview`, `/intents`, `/agents`, `/sla` | 4 calls per analytics page visit |
| `GET /billing/subscription`, `/billing/usage` | Billing page loads |
| `GET /tenant/whatsapp/status`, `/tenant/policies`, `/tenant/templates` | Settings page loads |
| `GET /orders` | Orders list |
| `GET /team` | Team list + quota |
| `GET /inbox`, `GET /inbox/stats` | Inbox page loads |
| `GET /cases` | Cases page loads |
| `GET /products`, `GET /products/categories` | Products page loads (also mocks `POST /products` to avoid IPv6/IPv4 issues on Linux CI) |

> **Note on POST /products mock:** `route.fetch()` fails on Linux CI runners because `localhost` resolves to `::1` (IPv6) while the API binds on `127.0.0.1` (IPv4). The POST handler is fully mocked: it parses the request body via `route.request().postData()`, builds a fake product, pushes it to an in-memory `mockProductStore`, and returns HTTP 201. This allows the "create and verify new product appears" test to work without a real API call.

### Test files

| File | Coverage |
|------|----------|
| `e2e/auth.spec.ts` | Login, register, forgot-password, redirect guards |
| `e2e/navigation.spec.ts` | All pages load, sidebar, no 5xx |
| `e2e/products.spec.ts` | Product list, CRUD modals, search, role guard |
| `e2e/orders.spec.ts` | Orders list, search, status filter |
| `e2e/team.spec.ts` | Member list, add/edit modals, quota bar, role guard |
| `e2e/settings.spec.ts` | All 4 tabs, WhatsApp status, n8n section |
| `e2e/billing.spec.ts` | Plan cards, usage bars, owner vs agent view |
| `e2e/analytics.spec.ts` | Metric cards, charts, agent table |

## 🧪 API Integration Tests (Vitest)

~35 Vitest + Supertest tests covering auth, team quota, webhook signature, and product CRUD. They run against a real `whatsapp_bot_test` PostgreSQL database (no mocks, no running server needed).

### One-time setup

```bash
# Create the test database
docker exec whatsapp-bot-db psql -U whatsapp_bot -d postgres \
  -c "CREATE DATABASE whatsapp_bot_test;"
docker exec whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot_test \
  -c "GRANT ALL ON DATABASE whatsapp_bot_test TO whatsapp_bot;"

# Push the Prisma schema to the test database
DATABASE_URL=postgresql://whatsapp_bot:localdev@localhost:5433/whatsapp_bot_test \
  pnpm --filter @whatsapp-bot/api exec prisma db push --skip-generate
```

### Run the tests

```bash
pnpm test:api              # single run (from repo root)
cd apps/api && pnpm test   # or run directly
pnpm test:watch            # watch mode
pnpm test:coverage         # with coverage report
```

**Requirements:** Docker must be running (PostgreSQL + Redis via `docker-compose up -d`).

### Test files

| File | Coverage |
|------|----------|
| `src/__tests__/auth.test.ts` | Register, login, refresh token, forgot-password |
| `src/__tests__/team.test.ts` | List, create (quota enforcement), owner protection |
| `src/__tests__/webhook.test.ts` | Hub challenge, HMAC reject/accept |
| `src/__tests__/product.test.ts` | CRUD, soft-delete, CSV import |

---

## 🌐 Production Deployment

Production deployment uses Docker Compose. See `docker-compose.prod.yml` and `.env.production.example` at the repo root.

**⚠️ Before deploying to production:**

1. Change all secrets in `.env` (JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, AUTOMATION_API_KEY)
2. Use a managed PostgreSQL instance or the Docker service with a persistent volume
3. Use a managed Redis instance or the Docker service with persistence enabled
4. Configure Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Price IDs
5. Set `NODE_ENV=production`
6. Enable HTTPS via Let's Encrypt (configured in `nginx/nginx.conf`)
7. Set up monitoring via `GET /metrics` (Prometheus)
8. Schedule database backups with `scripts/backup-db.sh`

**Zero-downtime deploy:**
```bash
./scripts/deploy.sh
```

## 📞 Support

For issues or questions:
- Review `PLAN.md` for project structure and feature checklist
- Review `CLAUDE.md` for complete API reference and architecture
- Check `docs/ENV_KEYS_GUIDE.md` for environment variable explanations
- Check GitHub issues (if applicable)

## ✅ Success Checklist

- [ ] PostgreSQL database running (`docker ps` shows `whatsapp-bot-db`)
- [ ] Redis running (`docker ps` shows `whatsapp-bot-redis`)
- [ ] API server running on port 4000
- [ ] BullMQ webhook worker started (check API logs)
- [ ] Dashboard running on port 3001
- [ ] Can login to dashboard
- [ ] Inbox page loads
- [ ] Orders page loads (`/dashboard/orders`)
- [ ] Billing page loads (`/dashboard/billing`)
- [ ] Team page loads (`/dashboard/team`)
- [ ] Analytics page shows data
- [ ] API health check returns OK (`curl http://localhost:4000/health`)
- [ ] Automation dispatcher is polling

If all items are checked, **you're ready to go! 🚀**

---

**Happy coding! 💬🤖**
