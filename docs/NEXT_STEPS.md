# Next Steps

The core platform is production-ready (API + Dashboard + billing + AI + E2E tests). This document lists the remaining work, ordered by impact.

---

## ✅ 1. GitHub Actions CI Pipeline — DONE

`.github/workflows/ci.yml` is live with 3 jobs (Type Check → Build → E2E Tests). All 84 Playwright tests pass in CI (Run #14, commit `c149677`, ~4m 47s total).

Key implementation notes:
- `services:` block for PostgreSQL (port 5433) and Redis (6379)
- pnpm store + Playwright browser cache between runs
- Dashboard readiness check uses `/login` (not `/`) — Next.js has no root page
- All high-volume API endpoints mocked in `e2e/fixtures/auth.fixture.ts` to avoid rate limiter
- `POST /products` fully mocked (no `route.fetch()`) to avoid Linux IPv6/IPv4 issue

---

## ✅ 2. Inbox & Cases E2E Specs — DONE (via mocks)

`/inbox`, `/inbox/stats`, and `/cases` are fully mocked in `e2e/fixtures/auth.fixture.ts`. The `navigation.spec.ts` no-5xx test covers all 8 pages including inbox and cases without hitting the real API. Dedicated `inbox.spec.ts` and `cases.spec.ts` with interaction tests remain optional future work.

---

## ✅ 3. API Integration Tests (Vitest) — DONE

Vitest + Supertest integration tests are live in `apps/api/src/__tests__/`. ~35 tests across 4 files, running against a real `whatsapp_bot_test` PostgreSQL database. A new `api-test` CI job (parallel to `build`, gating `e2e`) runs them on every push.

### Test files implemented

| File | Coverage (~tests) |
|------|-------------------|
| `auth.test.ts` | Register, login, refresh token, forgot-password (12) |
| `team.test.ts` | List, create with quota enforcement, owner protection (9) |
| `webhook.test.ts` | Hub challenge, HMAC reject/accept (3) |
| `product.test.ts` | CRUD, soft-delete, CSV import (10) |

### Key implementation notes
- Rate limiters bypass in `NODE_ENV=test` (noop middleware in `rateLimiter.ts`)
- `vitest.config.ts` loads `.env.test` via `dotenv.config()` before `defineConfig` — ensures `env.ts` Zod parse succeeds
- Each test creates its own isolated tenant (unique slug + email); `setup.ts` runs `TRUNCATE "Tenant" CASCADE` before each file
- Free-plan quota test: `maxAgents=1`, owner counts as 1 user → `POST /team` fails immediately
- Run locally: `pnpm test:api` (requires test DB, see `docs/RUNNING.md`)

---

## ✅ 4. Production Deployment — DONE

All infrastructure files are production-ready. Scripts, Dockerfiles, nginx config, and compose file are polished and complete.

### What was built/fixed
- `docker-compose.prod.yml` — fixed dashboard healthcheck (`/login`), Redis healthcheck (CMD-SHELL), added AI + email env vars to API service
- `apps/api/Dockerfile` + `apps/dashboard/Dockerfile` — upgraded pnpm@8 → pnpm@9 to match lockfile
- `scripts/setup-server.sh` — one-command Ubuntu 22.04 bootstrap (Docker, UFW firewall, fail2ban, swap)
- `scripts/init-ssl.sh` — first-time Let's Encrypt SSL + domain wiring + auto-renewal hook install
- `scripts/renew-ssl.sh` — certbot deploy hook (copies renewed certs + reloads nginx, zero downtime)

### Operator deployment checklist
- [ ] Provision VPS (Ubuntu 22.04, 2+ vCPU, 4 GB RAM) and SSH in as root
- [ ] `sudo bash scripts/setup-server.sh` — installs Docker, UFW, certbot, fail2ban
- [ ] Clone repo to `/opt/whatsapp-chatbot` and `cd` into it
- [ ] `cp .env.production.example .env.production && nano .env.production`
- [ ] Point DNS A record to server IP, then `sudo bash scripts/init-ssl.sh`
- [ ] Configure Stripe webhook → `https://yourdomain.com/billing/stripe-webhook`
- [ ] Configure Meta WhatsApp webhook → `https://yourdomain.com/webhook/whatsapp`
- [ ] Add daily DB backup cron: `0 2 * * * docker exec wab-postgres bash /backup.sh >> /var/log/db-backup.log 2>&1`

See `docs/DEPLOYMENT.md` for the full step-by-step guide.

---

## ✅ 5. Monitoring & Alerting — DONE

Prometheus + Grafana are live in `docker-compose.prod.yml`. Dashboard accessible at `https://your-domain.com/grafana/`.

### What was built
- `monitoring/prometheus.yml` — scrapes `api:4000/metrics` every 15s, 15-day retention
- `monitoring/alert.rules.yml` — 5 alert rules (error rate, webhook latency, queue backup, quota violations, AI errors)
- `monitoring/grafana/provisioning/` — auto-provisions Prometheus datasource + dashboard on container start
- `monitoring/grafana/dashboards/whatsapp-bot.json` — 8-panel dashboard (request rate, 5xx%, p50/p95 latency, queue depth, intent breakdown, AI requests/latency, quota violations)
- `apps/api/src/lib/metrics.ts` — added `http_requests_total{method, route, status}` counter
- `apps/api/src/app.ts` — HTTP metrics middleware (increments counter on `res.finish`)
- `apps/api/src/services/queue/` — `webhook_queue_depth` gauge now increments on enqueue, decrements on complete/fail

### Metrics available
| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | All API requests by method, route, status |
| `whatsapp_webhooks_total` | Counter | Inbound webhook requests by status |
| `whatsapp_messages_processed_total` | Counter | Processed messages by tenant + intent |
| `message_processing_duration_seconds` | Histogram | Webhook pipeline latency |
| `whatsapp_send_total` | Counter | Outbound messages by tenant + type + status |
| `webhook_queue_depth` | Gauge | BullMQ jobs waiting |
| `quota_exceeded_total` | Counter | Quota violations by tenant + type |
| `ai_requests_total` | Counter | AI provider calls by provider + type + status |
| `ai_request_duration_seconds` | Histogram | AI call latency |

### Operator setup
```bash
# Set password in .env.production
GRAFANA_PASSWORD=strong_password_here

# Services start automatically with the stack
docker compose -f docker-compose.prod.yml up -d

# Access Grafana at
https://your-domain.com/grafana/
# Default admin user: admin / GRAFANA_PASSWORD
```

### Alert rules (evaluated by Prometheus)
- **HighApiErrorRate** — 5xx rate > 1% for 5m → critical
- **SlowWebhookProcessing** — p95 latency > 5s for 5m → warning
- **WebhookQueueBackup** — queue depth > 100 for 2m → warning
- **FrequentQuotaViolations** — quota hit rate > 0.1/s per tenant → warning
- **HighAiErrorRate** — AI error rate > 10% per provider → warning

> To receive alert notifications, configure a Grafana contact point (email / Slack / PagerDuty) under **Alerting → Contact points** in the Grafana UI, then add a notification policy.

---

## ✅ 6. WhatsApp Template Sync — DONE

Templates can now be synced from the Meta Graph API into the local DB.

### What was built
- `apps/api/prisma/schema.prisma` — added `metaStatus String?` to `ReplyTemplate` (null = local-only, otherwise `APPROVED` / `PENDING` / `REJECTED` / etc.)
- `apps/api/prisma/migrations/20260305000001_add_reply_template_meta_status/` — migration that adds the column
- `apps/api/src/services/whatsapp/metaTemplate.service.ts` — `syncMetaTemplates(tenantId)`: fetches all templates from `GET /v19.0/{wabaId}/message_templates` (paginated), maps language codes (`en_US` → `EN`, `si` → `SI`, `ta` → `TA`), extracts BODY component text, and upserts into `ReplyTemplate` using the template name as `intent`
- `POST /tenant/whatsapp/templates/sync` (owner/admin only) — triggers the sync and returns `{ synced, skipped, errors }`
- `apps/dashboard/src/lib/api.ts` — `syncMetaTemplates()` method
- `apps/dashboard/src/app/dashboard/settings/page.tsx` — "Sync from Meta" button (beside "+ Create Template"), success/error feedback, new **Meta** column showing the approval-status badge per row; local templates show "Local" label

### Prerequisites
- The WhatsApp connection must have **WABA ID** set. If not, sync returns HTTP 400 with a descriptive message.
- The stored access token must have `whatsapp_business_management` permission.

---

## ✅ 7. Customer-Facing Signup Flow — DONE

Post-registration onboarding wizard is live at `/onboarding`.

- `/register` now redirects to `/onboarding` instead of `/dashboard` after account creation
- 3-step wizard (`apps/dashboard/src/app/onboarding/page.tsx`):
  1. **Connect WhatsApp** — phoneNumberId, accessToken, webhookVerifyToken (+ optional fields). Calls `POST /tenant/whatsapp/connect`. Skippable.
  2. **Choose Plan** — FREE/PRO/BUSINESS cards. Free → continue to step 3. Paid → triggers Stripe checkout (lands on `/dashboard/billing?success=1` after payment).
  3. **Configure** — timezone picker, language toggle (English/Sinhala/Tamil), tone selector. Calls `PUT /tenant/policies`. Skippable.
- "Skip setup →" link in header exits the wizard at any time
- Auth-guarded: unauthenticated visitors are redirected to `/login`
- Remaining gap: email verification before tenant becomes active (not yet implemented)

---

## 8. n8n Workflow Hardening

The n8n automation integration works but has some gaps for production use:

- **Dead-letter queue:** Failed automation events are marked `failed` but never retried or alerted on. Add a cron job or BullMQ scheduled job to re-queue events stuck in `pending` > 10 minutes.
- **Event replay UI:** An admin panel page to view recent automation events and manually re-trigger failed ones.
- **Webhook signature verification on n8n callbacks:** `POST /automation/webhook/n8n` currently only validates the `AUTOMATION_API_KEY` header but not a request signature, making it vulnerable to replay attacks on public deployments.

---

## Priority Summary

| # | Task | Status | Effort | Impact |
|---|------|--------|--------|--------|
| 1 | GitHub Actions CI | ✅ Done | Low | High — every PR validated |
| 2 | Inbox & Cases E2E | ✅ Done (mocked) | Low | Medium — closes coverage gap |
| 3 | API integration tests | ✅ Done | Medium | High — catches backend bugs |
| 4 | Production deployment | ✅ Done | Medium | Critical — needed for real users |
| 5 | Monitoring & alerting | ✅ Done | Medium | High — visibility in production |
| 6 | WhatsApp template sync | ✅ Done | Medium | Medium — needed for scale |
| 7 | Customer signup flow | ✅ Done | High | High — needed for self-serve growth |
| 8 | n8n hardening | Pending | Low | Medium — prevents silent failures |
