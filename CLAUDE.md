# CLAUDE.md - Project Context for AI Assistant

## Project
Multi-tenant WhatsApp Business Support Bot SaaS with hybrid n8n automation.

## Current Phase: ✅ ALL PHASES COMPLETE - Production Ready (Phase 5 Extensions + AI Phase Applied)

## Documentation
- [docs/USER_MANUAL.md](docs/USER_MANUAL.md) - Dashboard user manual
- [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) - Roles, sales process, revenue model
- [docs/ENV_KEYS_GUIDE.md](docs/ENV_KEYS_GUIDE.md) - Environment keys and integration flow
- [docs/INTENT_DETECTION.md](docs/INTENT_DETECTION.md) - Intent detection system and AI roadmap
- [docs/CUSTOMER_ONBOARDING.md](docs/CUSTOMER_ONBOARDING.md) - Customer onboarding guide (how tenants use the service)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment guide
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Quick start guide
- [docs/RUNNING.md](docs/RUNNING.md) - Running the project
- [docs/N8N_WORKFLOWS.md](docs/N8N_WORKFLOWS.md) - n8n workflow setup
- [docs/N8N_ORDER_DELIVERED_WORKFLOW.md](docs/N8N_ORDER_DELIVERED_WORKFLOW.md) - n8n post-delivery feedback workflow

## Quick Start
```bash
pnpm install                    # Install all dependencies
pnpm db:up                      # Start PostgreSQL via Docker
pnpm prisma:migrate             # Run database migrations
pnpm prisma:seed                # Seed demo data
pnpm dev                        # Start API (:4000) + Dashboard (:3001)
```

## Architecture

### Monorepo Structure
```
apps/api/          - Express + TypeScript + Prisma (port 4000)
apps/dashboard/    - Next.js App Router + TypeScript (port 3001)
packages/shared/   - Zod schemas + types + constants
```

### Tech Stack
- **Runtime:** Node.js 18+, pnpm workspaces
- **API:** Express 4, Prisma ORM, PostgreSQL 16
- **Dashboard:** Next.js 14 (App Router), Tailwind CSS
- **Responsive Design:** Mobile-first with breakpoints (sm:640px, md:768px, lg:1024px, xl:1280px)
- **Auth:** JWT (24h expiry, bcrypt passwords)
- **Encryption:** AES-256-GCM for WhatsApp tokens

### Key Principles
- **Multi-tenancy:** Every DB record has `tenantId`. Dashboard APIs derive tenantId from JWT, never from client.
- **WhatsApp Core:** All WhatsApp messaging goes through core API. n8n NEVER calls WhatsApp directly.
- **Webhook routing:** Incoming webhooks route to tenant via `phone_number_id` → `TenantWhatsApp` lookup.

### Data Models (Prisma)
19 models: Tenant, TenantUser, TenantWhatsApp, Customer, Conversation, Message, Product, TenantPolicies, ReplyTemplate, AutomationEvent, Case, **TenantSubscription, UsageCounter, TenantQuotaOverride** (billing), **Order, OrderItem, Shipment** (orders), **PasswordResetToken** (auth)

**ReplyTemplate notable fields:** `metaStatus String?` — null = locally created; `"APPROVED"` / `"PENDING"` / `"REJECTED"` = synced from Meta Graph API via `POST /tenant/whatsapp/templates/sync`

### Key Files
- `apps/api/prisma/schema.prisma` - Complete data model (19 models)
- `apps/api/src/app.ts` - Express app setup (rawBody capture for webhook sig verification, rate limiters, HTTP metrics middleware)
- `apps/api/src/server.ts` - Server entry point (starts BullMQ worker after Express)
- `apps/api/src/config/env.ts` - Zod-validated env vars
- `apps/api/src/config/plans.ts` - Plan limits config (FREE / PRO / BUSINESS)
- `apps/api/src/routes/index.ts` - Route wiring (all routes including billing, orders, metrics, team)
- `packages/shared/src/index.ts` - Shared schemas/types barrel export

### Phase 2 Services (Webhook + Auth)
- `src/services/whatsapp/webhook.service.ts` - 14-step inbound message pipeline
- `src/services/whatsapp/send.service.ts` - WhatsApp Cloud API sender (sendText, sendInteractiveList, sendProductMessage, sendProductSelectionList)
- `src/services/whatsapp/parser.ts` - Webhook payload parser
- `src/services/intent/intentEngine.ts` - Rules-first intent detection (8 rules + AI stub)
- `src/services/intent/rules/*.ts` - greeting, refundCancel, orderTracking, hoursLocation, agentRequest, complaint, optOut, productInquiry
- `src/services/response/responseEngine.ts` - Template-based response generation + agent handoff + product inquiry handler
- `src/services/tenant/tenantRouting.service.ts` - phone_number_id → tenant (LRU cache)
- `src/services/auth/auth.service.ts` - register, login, getMe, requestPasswordReset, resetPassword
- `src/services/email/email.service.ts` - Resend email client (sendPasswordResetEmail; logs URL to console if RESEND_API_KEY not set)
- `src/lib/crypto.util.ts` - AES-256-GCM encrypt/decrypt, HMAC-SHA256
- `src/lib/jwt.util.ts` - JWT sign/verify
- `src/middleware/signatureVerify.ts` - X-Hub-Signature-256 verification
- `src/middleware/requireAuth.ts` - JWT Bearer token extraction (sets `req.auth` with tenantId, userId, role)
- `src/middleware/requireAutomationKey.ts` - Automation API key validation for n8n webhooks

### Phase 3 Services (Products + Search)
- `src/services/product/product.service.ts` - Product CRUD + bulk upsert + categories
- `src/services/product/productSearch.service.ts` - pg_trgm fuzzy search + WhatsApp list formatting
- `src/services/product/csvImport.service.ts` - CSV parsing with validation (camelCase + snake_case columns)
- `src/routes/product.routes.ts` - Product CRUD + search + CSV import endpoints

### Phase 4 Services (Inbox, Cases, Analytics, Automation)
- `src/services/inbox/inbox.service.ts` - Inbox conversation management, agent assignment, replies
- `src/services/case/case.service.ts` - Case CRUD, SLA tracking, priority management
- `src/services/analytics/analytics.service.ts` - Overview, intent, agent performance, SLA metrics
- `src/services/automation/automation.service.ts` - n8n webhook integration (plan-gated, usage-tracked)
- `src/routes/inbox.routes.ts` - Inbox endpoints (list, stats, assign, reply, close)
- `src/routes/case.routes.ts` - Case management endpoints
- `src/routes/analytics.routes.ts` - Analytics endpoints (overview, intents, agents, sla)
- `src/routes/automation.routes.ts` - Automation webhook endpoints + `POST /automation/actions/send-template`

**Important:** All routes use `req.auth` (not `req.user`) to access JWT payload set by `requireAuth` middleware.

### Phase 5 Services (Productionization + Billing + Language + Orders)

**Security & Reliability:**
- `src/lib/crypto.keyRotation.util.ts` - Key rotation with `v1$<ciphertext>` prefix, supports two active keys
- `src/lib/redis.ts` - ioredis singleton (connect to `REDIS_URL`)
- `src/lib/retry.util.ts` - `withExponentialBackoff(fn, maxAttempts, baseDelayMs)` generic helper
- `src/lib/metrics.ts` - Prometheus metrics registry (prom-client) — 9 metrics: `http_requests_total`, `whatsapp_webhooks_total`, `whatsapp_messages_processed_total`, `message_processing_duration_seconds`, `whatsapp_send_total`, `webhook_queue_depth`, `quota_exceeded_total`, `ai_requests_total`, `ai_request_duration_seconds`
- `src/middleware/rateLimiter.ts` - express-rate-limit: auth (5/15min), forgotPassword (3/15min), API (100/min keyed on tenantId)
- `src/middleware/stripeWebhookVerify.ts` - Stripe-Signature verification using `req.rawBody`
- `src/services/queue/webhook.queue.ts` - BullMQ Queue named `"webhook-processing"` — increments `webhook_queue_depth` gauge on enqueue
- `src/services/queue/webhook.worker.ts` - BullMQ Worker (same process as API, started in server.ts) — decrements `webhook_queue_depth` on complete/fail
- `src/services/whatsapp/metaTemplate.service.ts` - `syncMetaTemplates(tenantId)`: paginates `GET /v19.0/{wabaId}/message_templates`, maps locale codes to EN/SI/TA, upserts into `ReplyTemplate` with `metaStatus`; requires `wabaId` on `TenantWhatsApp`
- `src/services/cache/cache.service.ts` - Redis cache helpers with TTL (policies 60s, templates 60s, categories 120s)
- `src/services/quota/outboundQuota.service.ts` - Per-tenant daily outbound message cap

**Billing:**
- `src/services/billing/usage.service.ts` - Atomic usage counters per `YYYY-MM` period (prisma upsert+increment)
- `src/services/billing/quota.service.ts` - Plan limit enforcement (inbound, agent, automation, analytics)
- `src/services/billing/billing.service.ts` - Stripe checkout sessions, portal sessions, webhook event handler
- `src/routes/billing.routes.ts` - `/billing` endpoints (checkout, portal, subscription, usage, stripe webhook)

**Language & Tone:**
- `src/services/language/language.service.ts` - Unicode language detection (Sinhala/Tamil/English), keyword overrides, conversation persistence
- `src/services/template/templateRender.service.ts` - Handlebars renderer with compiled template cache and 16 standard variables

**Orders:**
- `src/services/order/order.service.ts` - Order CRUD, auto-generated order numbers (ORD-YYMM-NNNN), status transitions
- `src/services/order/shipment.service.ts` - Shipment upsert + tracking status update
- `src/services/order/orderBot.service.ts` - WhatsApp bot order status lookup (regex extraction, 3-path resolution, formatted replies)
- `src/routes/order.routes.ts` - `/orders` endpoints + `/shipments/:id/update-status`
- `src/routes/metrics.routes.ts` - `GET /metrics` (Prometheus, nginx-restricted)

**Monitoring Stack (Prometheus + Grafana):**
- `monitoring/prometheus.yml` - Prometheus config: scrapes `api:4000/metrics` every 15s, 15-day retention
- `monitoring/alert.rules.yml` - 5 alert rules: HighApiErrorRate (>1% 5xx), SlowWebhookProcessing (p95>5s), WebhookQueueBackup (depth>100), FrequentQuotaViolations, HighAiErrorRate
- `monitoring/grafana/provisioning/datasources/prometheus.yml` - auto-provisions Prometheus datasource (uid: `prometheus`)
- `monitoring/grafana/provisioning/dashboards/dashboard.yml` - dashboard file provider
- `monitoring/grafana/dashboards/whatsapp-bot.json` - 8-panel overview dashboard; access via `/grafana/` after deploy
- Grafana access: `https://yourdomain.com/grafana/` — login: `admin` / `GRAFANA_PASSWORD`

**Team Management:**
- `src/services/team/team.service.ts` - Team CRUD (list, create, update), quota enforcement via `checkAgentLimit`, owner protection
- `src/routes/team.routes.ts` - `/team` endpoints (GET list, POST create, PUT update)
- `packages/shared/src/schemas/team.schema.ts` - Zod schemas (createTeamMemberSchema, updateTeamMemberSchema)

**AI Intent Detection & Response Generation:**
- `src/services/intent/aiProvider.interface.ts` - AIIntentProvider interface + StubAIProvider
- `src/services/intent/providers/anthropicProvider.ts` - Anthropic Claude intent provider (claude-3-5-haiku)
- `src/services/intent/providers/openaiProvider.ts` - OpenAI intent provider (gpt-4o-mini)
- `src/services/intent/providers/geminiProvider.ts` - Google Gemini intent provider (gemini-2.5-flash)
- `src/services/intent/providers/index.ts` - Provider factory (reads AI_PROVIDER env var)
- `src/services/intent/intentEngine.ts` - Rules-first, AI-fallback intent detection with quota + tenant toggle checks
- `src/services/ai/aiResponse.service.ts` - AI response generation (contextual replies when no template matches, supports Anthropic/OpenAI/Gemini)
- AI flow: rules (8 regex matchers) → tenant aiEnabled check → quota check → AI intent detection → template lookup → AI response fallback
- Per-plan AI quotas: free=50/mo, pro=1000/mo, business=10000/mo
- Tenant toggle: `TenantPolicies.aiEnabled` (default false)
- Usage tracked via `incrementUsage(tenantId, 'aiCallsCount')`

### Dashboard Components (Responsive UI) - ✅ COMPLETE
**Shared Components:**
- `apps/dashboard/src/components/Sidebar.tsx` - Responsive sidebar with mobile drawer (hamburger menu)
- `apps/dashboard/src/components/Modal.tsx` - ✅ Reusable modal dialog (overlay, close on Esc, customizable footer)
- `apps/dashboard/src/components/Badge.tsx` - ✅ Color-coded status/priority badges (6 variants)
- `apps/dashboard/src/components/EmptyState.tsx` - ✅ Empty state placeholder with icon and action button
- `apps/dashboard/src/components/LoadingSpinner.tsx` - ✅ Loading indicator (3 sizes)
- `apps/dashboard/src/components/ResponsiveTable.tsx` - Tables that convert to cards on mobile

**Custom Hooks:**
- `apps/dashboard/src/hooks/useDebounce.ts` - ✅ Debounce hook for search inputs (300ms default)

**Components:**
- `apps/dashboard/src/components/UsageBar.tsx` - Progress bar with color coding (blue → orange at 80% → red at 95%)

**Pages:**
- `apps/dashboard/src/app/dashboard/layout.tsx` - Main layout with mobile header & sidebar state
- `apps/dashboard/src/app/dashboard/inbox/page.tsx` - Inbox with mobile view toggle (list ↔ chat)
- `apps/dashboard/src/app/dashboard/cases/page.tsx` - ✅ Cases with SLA tracking, filters, detail modal (view/edit)
- `apps/dashboard/src/app/dashboard/products/page.tsx` - ✅ Products CRUD, search, filters, CSV import
- `apps/dashboard/src/app/dashboard/analytics/page.tsx` - Analytics with responsive grids & tables
- `apps/dashboard/src/app/dashboard/settings/page.tsx` - ✅ WhatsApp config, policies, templates, n8n, Language & Tone tab
- `apps/dashboard/src/app/dashboard/billing/page.tsx` - ✅ Plan cards (FREE/PRO/BUSINESS), usage bars, Stripe upgrade/manage, role-based access (owner-only upgrade/manage, non-owner info banner)
- `apps/dashboard/src/app/dashboard/orders/page.tsx` - ✅ Orders list with filters, search, pagination, inline actions
- `apps/dashboard/src/app/dashboard/orders/[id]/page.tsx` - ✅ Order detail with items, shipment form, status buttons
- `apps/dashboard/src/app/dashboard/team/page.tsx` - ✅ Team management: member list, create/edit modals, activate/deactivate, quota bar
- `apps/dashboard/src/app/login/page.tsx` - Login with responsive padding, sign-up link to /register, forgot password link
- `apps/dashboard/src/app/register/page.tsx` - ✅ Owner registration (business name, name, email, password), auto-login on success, redirects to /onboarding
- `apps/dashboard/src/app/onboarding/page.tsx` - ✅ Post-registration onboarding wizard (3 steps: Connect WhatsApp → Choose Plan → Configure policies). Standalone page (no sidebar), auth-guarded. FREE plan → step 3; paid plan → Stripe checkout.
- `apps/dashboard/src/app/forgot-password/page.tsx` - ✅ Forgot password: email input → generic "check your email" confirmation
- `apps/dashboard/src/app/reset-password/page.tsx` - ✅ Reset password: reads token from URL query param, new password + confirm fields, redirects to /login on success

### Responsive Design Patterns
- **Sidebar:** Fixed on desktop (lg:), mobile drawer overlay with hamburger (<lg)
- **Inbox:** Two-column on tablet+ (md:), single-column toggle on mobile (<md)
- **Tables:** Table view on desktop (md:), card layout on mobile (<md)
- **Touch targets:** py-3 on mobile, py-2 on desktop for better tap accessibility
- **Font sizes:** Scale down on mobile (text-xs → text-sm → text-base)
- **Padding:** Responsive (p-4 md:p-6 lg:p-8)

### Demo Credentials
- **Tenant:** Acme Store (slug: acme-store)
- **Owner:** owner@acme.test / password123
- **Agent:** agent@acme.test / password123

### Environment
Copy `.env.example` to `.env` at repo root AND to `apps/api/.env` (Prisma needs it). Key vars:
- `DATABASE_URL` - PostgreSQL connection string (port 5433 to avoid local PG conflict)
- `JWT_SECRET` - JWT signing secret (access tokens, 15 min)
- `JWT_REFRESH_SECRET` - JWT signing secret for refresh tokens (7 days)
- `ENCRYPTION_KEY` - 32-byte hex key for AES-256-GCM
- `WEBHOOK_VERIFY_TOKEN` - WhatsApp webhook verification token
- `REDIS_URL` - Redis connection string (required for BullMQ queue + cache)
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_live_... or sk_test_...)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint signing secret (whsec_...)
- `STRIPE_PRICE_ID_PRO` - Stripe Price ID for PRO plan
- `STRIPE_PRICE_ID_BUSINESS` - Stripe Price ID for BUSINESS plan
- `DASHBOARD_URL` - Public URL of dashboard (for Stripe redirect URLs)
- `AI_PROVIDER` - AI provider: `anthropic`, `openai`, `gemini`, or `none` (default: `none`)
- `ANTHROPIC_API_KEY` - Anthropic API key (required if AI_PROVIDER=anthropic)
- `OPENAI_API_KEY` - OpenAI API key (required if AI_PROVIDER=openai)
- `GEMINI_API_KEY` - Google Gemini API key (required if AI_PROVIDER=gemini)
- `AI_MODEL` - Model override (default: `claude-3-5-haiku-20241022` for Anthropic, `gpt-4o-mini` for OpenAI, `gemini-2.5-flash` for Gemini)
- `AI_TIMEOUT_MS` - AI call timeout in milliseconds (default: 5000)
- `RESEND_API_KEY` - Resend API key for sending password reset emails (optional; logs URL to console if not set)
- `EMAIL_FROM` - Sender address for outgoing emails (default: `noreply@example.com`)

See `.env.production.example` for full production var list with comments.

### Port Assignments
- **API:** 4000
- **Dashboard:** 3001 (3000 occupied by other service)
- **PostgreSQL (Docker):** 5433 (5432 occupied by local PG)
- **Redis (Docker):** 6379 (standard)

### Dependencies Added in Phase 5
```bash
# API
express-rate-limit  - Rate limiting middleware
bullmq              - Job queue (webhook processing)
ioredis             - Redis client
prom-client         - Prometheus metrics
stripe              - Stripe billing SDK
handlebars          - Template rendering (multi-language)

# AI (Phase 6)
@anthropic-ai/sdk          - Anthropic Claude API client
openai                     - OpenAI API client
@google/generative-ai      - Google Gemini API client

# Auth Extensions
resend                     - Transactional email (password reset)
```

### Queue Worker Note
The BullMQ webhook worker runs **in the same process as the API** (not a separate container). It is started in `server.ts` after Express begins listening. If the process crashes, jobs are persisted in Redis and retried on restart. BullMQ uses a **plain connection config object** (host/port/password/db) instead of a Redis instance to avoid ioredis version conflicts in the pnpm monorepo.

### API Endpoints (All Phases)
```
GET  /health                        - Health check
GET  /metrics                       - Prometheus metrics (nginx-restricted to internal IPs)

# WhatsApp Webhook
GET  /webhook/whatsapp              - WhatsApp verification (hub.mode, hub.verify_token, hub.challenge)
POST /webhook/whatsapp              - Inbound messages (signature verified, enqueued, always 200)

# Auth (Dashboard UI: /login, /register, /forgot-password, /reset-password pages)
POST /auth/register                 - Create tenant + owner, returns JWT (dashboard: /register page)
POST /auth/login                    - Login, returns access + refresh tokens (dashboard: /login page)
GET  /auth/me                       - Current user + tenant
POST /auth/refresh                  - Refresh access token (body: { refreshToken })
POST /auth/forgot-password          - Request password reset email (rate-limited 3/15min; always 200, no enumeration)
POST /auth/reset-password           - Apply new password with reset token (validates hash + expiry + one-time use)

# Tenant Config
POST /tenant/whatsapp/connect              - Store phone_number_id + encrypted tokens
GET  /tenant/whatsapp/status               - Connection status
PUT  /tenant/whatsapp/catalog              - Set catalog ID
POST /tenant/whatsapp/templates/sync       - Sync approved templates from Meta Graph API (owner/admin; returns { synced, skipped, errors })
GET  /tenant/policies               - Get tenant policies (defaultLanguage, tone, autoDetectLanguage, etc.)
PUT  /tenant/policies               - Update policies
GET  /tenant/templates              - List reply templates (language + tone aware)
POST /tenant/templates              - Create template
PUT  /tenant/templates/:id          - Update template
DELETE /tenant/templates/:id        - Delete template

# Products
GET  /products                      - List products (query, category, inStock, pagination)
GET  /products/categories           - List distinct categories
GET  /products/search               - Fuzzy search (pg_trgm + keywords)
GET  /products/:id                  - Get single product
POST /products                      - Create product
POST /products/import               - CSV import (multipart, upsert by retailerId)
PUT  /products/:id                  - Update product
DELETE /products/:id                - Soft-delete product (isActive=false)

# Inbox
GET  /inbox                         - List inbox conversations (status, assignedTo, pagination)
GET  /inbox/stats                   - Inbox statistics (needsAgent, inProgress, unassigned, myAssigned)
GET  /inbox/:conversationId         - Get conversation with full message history
POST /inbox/:conversationId/assign  - Assign conversation to agent
POST /inbox/:conversationId/reply   - Send agent reply
POST /inbox/:conversationId/close   - Close conversation and cases

# Cases
GET  /cases                         - List cases (status, assignedTo, priority, pagination)
GET  /cases/:caseId                 - Get single case
PUT  /cases/:caseId                 - Update case (status, priority, notes, etc.)

# Analytics
GET  /analytics/overview            - Overview metrics (conversations, cases, messages, response time, SLA)
GET  /analytics/intents             - Intent distribution
GET  /analytics/agents              - Agent performance metrics
GET  /analytics/sla                 - SLA performance by priority

# Automation (requires AUTOMATION_API_KEY header)
POST /automation/webhook            - n8n webhook receiver
GET  /automation/events/:eventId    - Get event details (for n8n polling)
POST /automation/events/:eventId/delivered  - Mark event as delivered
POST /automation/events/:eventId/failed     - Mark event as failed
POST /automation/webhook/n8n        - Generic n8n webhook callback
POST /automation/actions/send-template      - Send WhatsApp template via n8n (post-delivery flows)

# Billing (requireAuth)
POST /billing/create-checkout-session  - Start Stripe checkout (owner only) → returns { url }
POST /billing/create-portal-session    - Open Stripe portal (owner only) → returns { url }
GET  /billing/subscription             - Current plan + period info (uses effective plan from tenant, not hardcoded)
GET  /billing/usage                    - Current month usage counters
POST /billing/stripe-webhook           - Stripe webhook (stripeWebhookVerify, no auth)

# Orders (requireAuth)
GET  /orders                           - List orders (status, q, limit, offset)
GET  /orders/:id                       - Order detail with items + shipment
POST /orders                           - Create order (owner/admin only)
PUT  /orders/:id                       - Update order (owner/admin only)
POST /orders/:id/mark-shipped          - Mark shipped, upsert Shipment, emit order.shipped event
POST /orders/:id/mark-delivered        - Mark delivered, emit order.delivered event
POST /orders/:id/cancel                - Cancel order
POST /orders/:id/refund                - Refund order
POST /shipments/:id/update-status      - Update tracking status (owner/admin only)

# Team (requireAuth)
GET  /team                             - List team members + quota meta
POST /team                             - Create team member (owner/admin only, quota-enforced)
PUT  /team/:userId                     - Update team member name/role/isActive (owner/admin only)
```

### Dashboard API Client
- `apps/dashboard/src/lib/api.ts` - Centralized API client class with auth token management
- **Methods:** `login(email, password)`, `register(tenantName, email, password, name)`, `getMe()`, `logout()`, plus CRUD for all resources
- **Token key:** `auth_token` in localStorage (NOT `token`)
- **Base URL:** `NEXT_PUBLIC_API_URL` env var or `http://localhost:4000`
- **Error handling:** API returns `{ success: false, error: { code, message } }` — client extracts `error.message` string
- **Important:** All dashboard pages MUST use the `api` client or `API_BASE` constant for fetch calls, never relative URLs like `/api/...` (which hit Next.js on port 3001, not the Express API on port 4000)

### Auth Context
- `apps/dashboard/src/contexts/AuthContext.tsx` - React context providing `user`, `loading`, `login()`, `register()`, `logout()`
- Registration flow: calls `api.register()` → stores token → sets user state → redirects to `/dashboard`

### Coding Conventions
- TypeScript everywhere, strict mode
- Zod for all input validation
- Error classes in `middleware/errorHandler.ts` (AppError, NotFoundError, etc.)
- Request IDs on every request via `middleware/requestId.ts`
- Pino for structured logging
