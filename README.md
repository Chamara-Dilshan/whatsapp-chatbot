# 💬 WhatsApp Business Support Bot SaaS

A production-ready, multi-tenant WhatsApp Business API support bot with AI-powered intent detection, order management, multi-language replies, Stripe billing, agent inbox, case management, SLA tracking, and n8n automation.

## ✨ Features

### 🤖 Automated Customer Support
- WhatsApp Business API integration (Cloud API)
- AI-powered intent detection (8 pre-built rules + AI fallback)
- Automatic conversation routing with 14-step webhook pipeline
- Multi-language replies — English, Sinhala, Tamil (Unicode auto-detection)
- Tone control — Friendly, Formal, Short
- Handlebars template rendering with 16 standard variables
- Product catalog integration with fuzzy search (pg_trgm)
- Order status lookups via WhatsApp chat (regex order number extraction)
- 24-hour messaging window management
- Opt-in/opt-out handling with customer opt-out guard

### 📦 Order Management
- Full order lifecycle: Pending → Processing → Shipped → Delivered → Refunded
- Auto-generated order numbers (ORD-YYMM-NNNN format)
- Shipment tracking (carrier, tracking number, tracking URL)
- WhatsApp bot order status replies — by order number or customer phone lookup
- Automation events on `order.shipped` and `order.delivered` for n8n workflows
- Orders dashboard with filters, search, pagination, and inline actions

### 👥 Agent Workspace
- **Inbox Dashboard** — Manage customer conversations (responsive mobile/desktop)
- **Live Chat Interface** — Reply to customers in real-time
- **Conversation Assignment** — Assign chats to specific agents
- **Case Management** — Full case CRUD with SLA indicators
- **SLA Tracking** — Monitor response and resolution times with color-coded alerts
- **Priority Management** — Urgent, high, medium, low priorities
- **Product Catalog** — CRUD, fuzzy search, CSV bulk import

### 💳 Billing & Plans
- FREE / PRO / BUSINESS subscription tiers
- Stripe Checkout and Customer Portal integration
- Usage metering: inbound messages, outbound messages, automation events, AI calls
- Per-tenant monthly usage counters with atomic Prisma upsert+increment
- Quota enforcement: inbound limits, agent limits, feature gates (automation, analytics)
- Tenant quota overrides for custom enterprise plans
- Dashboard billing page with plan cards, usage bars, and Stripe redirect

### 📊 Analytics & Reporting
- Overview metrics (conversations, cases, response times, SLA breaches)
- Intent distribution analysis
- Agent performance tracking
- SLA compliance monitoring per priority level
- Customizable date ranges

### 🔄 Automation (n8n Integration)
- Event-driven automation workflows (plan-gated — PRO/BUSINESS only)
- 7 event types: case lifecycle, high-priority, SLA breach, order shipped/delivered
- `POST /automation/actions/send-template` — n8n can trigger WhatsApp template messages
- Retry mechanism with exponential backoff
- Event acknowledgement and failure reporting

### 🏢 Multi-Tenant Architecture
- Complete tenant isolation (every DB record has `tenantId`)
- Per-tenant configurations, policies, templates, language settings
- Encrypted WhatsApp credentials (AES-256-GCM)
- Role-based access control (owner / admin / agent)
- LRU cache for tenant routing by `phone_number_id`

### 🔒 Security & Reliability
- JWT authentication (15-min access tokens + 7-day refresh tokens)
- Webhook signature verification (strict 403 on invalid, 200 on unknown tenant)
- Rate limiting: auth (5 req/15 min), API (100 req/min per tenant/IP)
- BullMQ webhook job queue — returns 200 immediately, processes async
- Exponential backoff retries on WhatsApp sends (3 attempts, 500ms base)
- Redis cache for policies, templates, product categories
- Prometheus metrics (`GET /metrics`) with 5 counters/histograms
- Key rotation support (`v1$<ciphertext>` prefix)

---

## 🚀 Quick Start

**Get up and running in 5 minutes:**

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL + Redis
docker-compose up -d

# 3. Setup database
cd apps/api
pnpm prisma db push && pnpm prisma db seed
cd ../..

# 4. Start API (Terminal 1)
cd apps/api && pnpm dev

# 5. Start Dashboard (Terminal 2)
cd apps/dashboard && pnpm dev
```

**Access the dashboard:** http://localhost:3001
**Login:** `owner@acme.test` / `password123`

> **Note:** Docker starts both PostgreSQL (port 5433) and Redis (port 6379). Redis is required for the webhook processing queue.

📖 **Detailed guide:** [docs/RUNNING.md](docs/RUNNING.md) | **Quick reference:** [docs/QUICKSTART.md](docs/QUICKSTART.md)

---

## 📁 Project Structure

```
whatsapp-chatbot/
├── apps/
│   ├── api/                    # Express.js backend API (port 4000)
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── automation/ # n8n integration (plan-gated)
│   │   │   │   ├── billing/    # Stripe, usage counters, quota
│   │   │   │   ├── cache/      # Redis cache helpers
│   │   │   │   ├── case/       # Case management + SLA
│   │   │   │   ├── inbox/      # Agent inbox
│   │   │   │   ├── analytics/  # Metrics & SLA
│   │   │   │   ├── intent/     # AI intent detection rules
│   │   │   │   ├── language/   # Unicode language detection
│   │   │   │   ├── order/      # Order CRUD + bot handler
│   │   │   │   ├── queue/      # BullMQ webhook queue + worker
│   │   │   │   ├── quota/      # Outbound message cap
│   │   │   │   ├── template/   # Handlebars renderer
│   │   │   │   └── whatsapp/   # WhatsApp Cloud API send/webhook
│   │   │   ├── middleware/     # Auth, rate limit, Stripe verify
│   │   │   ├── config/         # Env vars, plan limits
│   │   │   └── lib/            # Redis, metrics, crypto, retry
│   │   └── prisma/             # Schema (18 models) + seeds
│   │
│   └── dashboard/              # Next.js frontend (port 3001)
│       ├── src/
│       │   ├── app/
│       │   │   ├── login/
│       │   │   └── dashboard/
│       │   │       ├── inbox/     # Conversation management
│       │   │       ├── cases/     # Case tracking & SLA
│       │   │       ├── products/  # Product catalog CRUD
│       │   │       ├── orders/    # Order management + [id] detail
│       │   │       ├── analytics/ # Metrics dashboard
│       │   │       ├── billing/   # Plans, usage, Stripe
│       │   │       └── settings/  # WhatsApp, policies, templates, language
│       │   ├── components/
│       │   │   ├── Sidebar.tsx        # Responsive navigation
│       │   │   ├── Modal.tsx          # Reusable modal dialog
│       │   │   ├── Badge.tsx          # Status/priority badges (6 variants)
│       │   │   ├── EmptyState.tsx     # Empty state placeholder
│       │   │   ├── LoadingSpinner.tsx # Loading indicator (3 sizes)
│       │   │   ├── ResponsiveTable.tsx# Mobile-friendly tables → cards
│       │   │   └── UsageBar.tsx       # Billing usage progress bars
│       │   ├── hooks/
│       │   │   └── useDebounce.ts     # Search debouncing (300ms)
│       │   └── lib/
│       │       └── api.ts             # Typed API client
│
├── packages/
│   └── shared/                 # Zod schemas, types, constants
│
├── docs/                       # Documentation
│   ├── USER_MANUAL.md
│   ├── ENV_KEYS_GUIDE.md
│   ├── RUNNING.md
│   ├── QUICKSTART.md
│   ├── N8N_WORKFLOWS.md
│   ├── N8N_ORDER_DELIVERED_WORKFLOW.md
│   └── ...
│
├── nginx/                      # nginx config + Dockerfile
├── scripts/                    # deploy.sh, backup-db.sh
├── docker-compose.yml          # Local dev (postgres + redis)
├── docker-compose.prod.yml     # Production (all services)
├── .env.production.example     # Production env template
├── PLAN.md                     # Development roadmap
└── CLAUDE.md                   # AI assistant context (architecture reference)
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18+, TypeScript (strict) |
| Framework | Express.js 4 |
| Database | PostgreSQL 16, Prisma ORM |
| Queue | BullMQ + ioredis (Redis) |
| Cache | Redis (ioredis) |
| Auth | JWT (access 15min + refresh 7 days), bcrypt |
| Encryption | AES-256-GCM for WhatsApp credentials |
| Search | pg_trgm fuzzy text search |
| Templates | Handlebars (multi-language rendering) |
| Billing | Stripe SDK (v20) |
| Metrics | prom-client (Prometheus) |
| Logging | Pino (structured JSON) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI Library | React 18 + Tailwind CSS |
| State | React Context API + local state |
| Responsive | Mobile-first (375px → 4K) |

### Infrastructure
| Component | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | nginx (SSL, upstream routing) |
| Monorepo | pnpm workspaces |
| Automation | n8n (optional, self-hosted) |
| CI Deploy | `scripts/deploy.sh` (zero-downtime) |

---

## 📊 Development Status

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Foundation, monorepo, Prisma schema, Docker |
| **Phase 2** | ✅ Complete | Webhook core, auth APIs, intent engine |
| **Phase 3** | ✅ Complete | Products backend, pg_trgm search, catalog integration |
| **Phase 4** | ✅ Complete | Inbox, cases, SLA, analytics, n8n, full dashboard UI |
| **Phase 5** | ✅ Complete | Security hardening, BullMQ queue, Prometheus metrics, Stripe billing, multi-language (EN/SI/TA), order management, production Docker deployment |

**See [PLAN.md](PLAN.md) for detailed roadmap and feature checklist**

---

## 🔑 Key Features Deep Dive

### Multi-Language Support (EN / Sinhala / Tamil)

The bot automatically detects language from Unicode character ranges (Sinhala: U+0D80–U+0DFF, Tamil: U+0B80–U+0BFF) and selects the best-matching reply template using a 4-step fallback:

1. `(detected language, configured tone)` → 2. `(EN, tone)` → 3. `(lang, FRIENDLY)` → 4. `(EN, FRIENDLY)`

Customers can switch language mid-conversation with keywords: "සිංහල", "sinhala", "தமிழ்", "tamil", "english".

### Order Management & Bot Integration

Orders are tracked through a full lifecycle. The bot handles order status inquiries:
- Customer: *"Where is ORD-2601-0001?"* → bot replies with status, items, and tracking info
- Customer: *"Where is my order?"* → bot fetches last 3 orders by phone number
- When `order.delivered` fires, n8n triggers a 2-day delayed feedback template message

### Intent Detection Engine

9 pre-built intent rules (rules-first, AI fallback):
- Greeting, Agent request, Complaint, Product inquiry, Price/availability
- Hours & location, Return/shipping policy, Opt-out/opt-in, **Order status** (with order number extraction)

### Billing & Plans

| Feature | FREE | PRO | BUSINESS |
|---|---|---|---|
| Agents | 1 | 3 | 10 |
| Inbound messages/month | 500 | 5,000 | 50,000 |
| n8n Automation | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |

Plan upgrades are instant via Stripe Checkout. Usage is tracked atomically per `YYYY-MM` period.

---

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/whatsapp_bot

# Auth
JWT_SECRET=min-32-char-secret
JWT_REFRESH_SECRET=different-min-32-char-secret

# Encryption
ENCRYPTION_KEY=64-char-hex-key

# WhatsApp
WEBHOOK_VERIFY_TOKEN=your-verify-token

# Redis (required)
REDIS_URL=redis://localhost:6379

# n8n Automation (optional)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/whatsapp-events
AUTOMATION_API_KEY=your-automation-key

# Stripe Billing (optional for local dev)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BUSINESS=price_...
DASHBOARD_URL=http://localhost:3001

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

See [docs/ENV_KEYS_GUIDE.md](docs/ENV_KEYS_GUIDE.md) for full explanations.
See `.env.production.example` for the complete production template.

### WhatsApp Business API Setup

1. Get credentials from Meta Business Manager → WhatsApp → API Setup
2. Configure webhook URL: `https://your-domain.com/webhook/whatsapp`
3. Connect via dashboard Settings → WhatsApp Configuration
4. Set `WEBHOOK_VERIFY_TOKEN` to match what you set in Meta

---

## 🔒 Security Features

- JWT with short-lived access tokens (15 min) + refresh tokens (7 days)
- AES-256-GCM encryption for stored WhatsApp credentials
- Bcrypt password hashing
- WhatsApp webhook HMAC-SHA256 signature verification (strict 403 mode)
- API key protection for all automation endpoints
- Rate limiting on auth (5/15min) and API (100/min per tenant)
- Tenant data isolation (every query scoped to `tenantId`)
- Log redaction for sensitive fields (`accessTokenEnc`, `appSecretEnc`, `passwordHash`)
- Key rotation support for encryption keys

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@acme.test","password":"password123"}'

# Check Prometheus metrics
curl http://localhost:4000/metrics

# Database check
docker exec -it whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot \
  -c "SELECT COUNT(*) FROM \"Order\";"
```

---

## 🆘 Support & Troubleshooting

| Issue | Fix |
|---|---|
| Port already in use | `netstat -ano \| findstr :4000` then `taskkill /PID <PID> /F` |
| Database won't connect | `docker-compose down && docker-compose up -d` |
| Redis not running | `docker-compose up -d redis` |
| Login fails | `cd apps/api && pnpm prisma db seed` |
| BullMQ not processing | Check Redis connection, check API logs for `BullMQ webhook worker started` |
| Stripe webhook rejected | Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard, ensure raw body is captured |

**Full guide:** [docs/RUNNING.md](docs/RUNNING.md) | **n8n setup:** [docs/N8N_WORKFLOWS.md](docs/N8N_WORKFLOWS.md)

---

## 🎯 Use Cases

- **E-commerce Support** — Product inquiries, order tracking, shipment status
- **Customer Service** — FAQ, complaints, case escalations with SLA
- **Multi-language Markets** — EN/Sinhala/Tamil support out of the box
- **Subscription SaaS** — Built-in Stripe billing with plan enforcement
- **Automation-heavy Ops** — n8n workflows for notifications, Jira tickets, feedback requests

---

## 🌟 Highlights

- ✅ **Production-ready** — rate limiting, queue, metrics, Docker Compose prod stack
- ✅ **Multi-language** — EN / Sinhala / Tamil with Unicode auto-detection
- ✅ **Stripe Billing** — FREE/PRO/BUSINESS tiers with usage metering
- ✅ **Order Management** — full lifecycle + WhatsApp bot integration
- ✅ **BullMQ Queue** — async webhook processing, always returns 200
- ✅ **Prometheus Metrics** — 5 counters/histograms at `GET /metrics`
- ✅ **Fully Responsive** — mobile, tablet, desktop (375px to 4K)
- ✅ **TypeScript strict** — zero type errors across API + Dashboard
- ✅ **Monorepo** — pnpm workspaces, shared Zod schemas
- ✅ **n8n Automation** — 7 event types + send-template action
- ✅ **Extensive docs** — user manual, env guide, n8n workflow guides

---

**Built with ❤️ for customer support excellence**

🚀 **[Get Started](docs/QUICKSTART.md)** | 📖 **[Full Docs](docs/RUNNING.md)** | 📋 **[Roadmap](PLAN.md)** | 👤 **[User Manual](docs/USER_MANUAL.md)**
