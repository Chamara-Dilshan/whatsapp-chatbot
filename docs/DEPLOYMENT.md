# Production Deployment Guide

Complete guide for deploying the WhatsApp Business Support Bot to a production server.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [Environment Configuration](#environment-configuration)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [First-Time Deployment](#first-time-deployment)
- [Subsequent Deployments](#subsequent-deployments)
- [Container Details](#container-details)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [Database Management](#database-management)
- [Monitoring](#monitoring)
- [WhatsApp Business API Setup](#whatsapp-business-api-setup)
- [Stripe Billing Setup](#stripe-billing-setup)
- [n8n Automation Setup](#n8n-automation-setup)
- [AI Provider Setup](#ai-provider-setup)
- [Security Hardening](#security-hardening)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedure](#rollback-procedure)

---

## Architecture Overview

```
Internet
   │
   ▼
Nginx (ports 80/443)          ← SSL termination, rate limiting, routing
   │
   ├── /webhook/whatsapp       → API (:4000)     ← WhatsApp inbound messages
   ├── /auth/*                 → API (:4000)     ← Authentication endpoints
   ├── /billing/*              → API (:4000)     ← Stripe billing + webhooks
   ├── /tenant|products|inbox  → API (:4000)     ← All other API routes
   │   |cases|analytics|orders
   │   |automation|team/*
   ├── /n8n/*                  → n8n (:5678)       ← Workflow automation UI
   ├── /grafana/*              → Grafana (:3000)   ← Monitoring dashboards
   └── /*                      → Dashboard (:3001) ← Next.js frontend (catch-all)
                                     │
                                     ▼
                               PostgreSQL (:5432) ← Primary data store
                               Redis (:6379)      ← BullMQ queue + cache
                               Prometheus (:9090) ← Metrics storage (internal)
                               Grafana (:3000)    ← Dashboards & alerting (internal)
```

### Container Map

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| wab-nginx | nginx:1.25-alpine | 80, 443 | Reverse proxy, SSL, rate limiting |
| wab-api | Custom (Node 18) | 4000 | Express API + BullMQ worker |
| wab-dashboard | Custom (Node 18) | 3001 | Next.js dashboard |
| wab-n8n | n8nio/n8n | 5678 | Workflow automation (optional) |
| wab-postgres | postgres:16-alpine | 5432 | PostgreSQL database |
| wab-redis | redis:7-alpine | 6379 | Redis (queue + cache) |
| wab-prometheus | prom/prometheus:v2.48.0 | 9090 | Metrics scraper + alert evaluation |
| wab-grafana | grafana/grafana:10.2.0 | 3000 | Dashboards + unified alerting |

### Network Topology

- **internal** network: All containers communicate on this bridge network. No ports are exposed to the host except through Nginx.
- **external** network: Only Nginx connects to this network, exposing ports 80 and 443 to the internet.

---

## Prerequisites

### Server Requirements

- **OS:** Ubuntu 22.04 LTS (recommended) or any Linux distro with Docker support
- **CPU:** 2+ vCPUs (4 recommended)
- **RAM:** 4 GB minimum (8 GB recommended)
- **Disk:** 40 GB SSD minimum
- **Providers:** DigitalOcean, AWS EC2, Hetzner, Linode, or any VPS

### Software Requirements

- Docker Engine 24+ and Docker Compose v2
- Git
- A registered domain name with DNS access
- (Optional) Certbot for Let's Encrypt SSL

### External Service Accounts

| Service | Required? | Purpose |
|---------|-----------|---------|
| Meta Business | Yes | WhatsApp Business API credentials |
| Stripe | Yes (for billing) | Payment processing |
| AI Provider | Optional | Anthropic, OpenAI, or Google Gemini for AI features |

---

## Server Setup

### Automated Setup (Recommended)

Run the one-command bootstrap script on a **fresh Ubuntu 22.04** VPS as root:

```bash
# SSH into your server, then:
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/whatsapp-chatbot/main/scripts/setup-server.sh | sudo bash
```

Or if you've already cloned the repo:

```bash
sudo bash scripts/setup-server.sh
```

This installs: Docker CE, Docker Compose plugin, Git, UFW firewall (22/80/443 only), certbot, fail2ban, unattended-upgrades, and a 2 GB swapfile if RAM < 2 GB.

### Manual Setup (Alternative)

<details>
<summary>Click to expand manual steps</summary>

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

Log out and back in for the group change to take effect.

### 2. Install Git and Certbot

```bash
sudo apt install git certbot -y
```

### 3. Clone the Repository

```bash
cd /opt
sudo git clone <repository-url> whatsapp-chatbot
sudo chown -R $USER:$USER /opt/whatsapp-chatbot
cd /opt/whatsapp-chatbot
```

### 4. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS only
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do NOT expose ports 4000, 3001, 5432, 6379, or 5678 directly. All traffic goes through Nginx.

</details>

---

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

### 2. Generate Secrets

```bash
# Generate JWT_SECRET (64-char hex)
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET (different from JWT_SECRET)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (32-byte hex for AES-256-GCM)
openssl rand -hex 32

# Generate AUTOMATION_API_KEY
openssl rand -hex 16

# Generate DB_PASSWORD
openssl rand -base64 24

# Generate REDIS_PASSWORD
openssl rand -base64 24
```

### 3. Fill in .env.production

Edit the file with your generated secrets and service credentials:

```bash
nano .env.production
```

**Required variables:**

```env
# Domain
DOMAIN=yourdomain.com
CERTBOT_EMAIL=you@yourdomain.com   # used by init-ssl.sh for Let's Encrypt notifications

# Database
DB_USER=whatsapp_bot
DB_PASSWORD=<generated-password>
DB_NAME=whatsapp_bot

# Redis
REDIS_PASSWORD=<generated-password>

# Auth secrets
JWT_SECRET=<generated-64-char-hex>
JWT_REFRESH_SECRET=<generated-different-64-char-hex>
ENCRYPTION_KEY=<generated-64-char-hex>

# WhatsApp
WEBHOOK_VERIFY_TOKEN=<your-chosen-verify-token>

# n8n (if using automation)
N8N_WEBHOOK_URL=https://yourdomain.com/n8n/webhook/whatsapp-events
AUTOMATION_API_KEY=<generated-key>
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong-password>

# Stripe (if using billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BUSINESS=price_...

# AI Provider (optional)
AI_PROVIDER=none
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# Dashboard
DASHBOARD_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Monitoring
GRAFANA_PASSWORD=<strong-grafana-admin-password>
```

**Important:** The `DATABASE_URL` and `REDIS_URL` are constructed automatically inside `docker-compose.prod.yml` from the individual variables. You do NOT need to set them in `.env.production`.

### 4. Secure the File

```bash
chmod 600 .env.production
```

---

## SSL/HTTPS Setup

### Option A: Automated with init-ssl.sh (Recommended)

After filling in `.env.production` (including `DOMAIN` and optionally `CERTBOT_EMAIL`), and with DNS already pointing to your server:

```bash
sudo bash scripts/init-ssl.sh
```

This script:
1. Substitutes `YOUR_DOMAIN_HERE` in `nginx/nginx.conf` with your domain
2. Starts a temporary nginx container to serve the ACME challenge on port 80
3. Runs `certbot certonly --webroot` to obtain the certificate
4. Copies certs to `nginx/certs/`
5. Installs `scripts/renew-ssl.sh` as a certbot deploy hook (auto-renewal)
6. Starts all production containers

### Option B: Manual Let's Encrypt

<details>
<summary>Click to expand manual steps</summary>

#### 1. Point DNS to Your Server

Create an A record pointing your domain to your server's IP. Wait for DNS propagation.

```
yourdomain.com → A → <server-ip>
```

#### 2. Obtain Certificates

```bash
# Stop anything on port 80, then run:
sudo certbot certonly --standalone -d yourdomain.com
```

#### 3. Copy Certificates to Nginx Directory

```bash
mkdir -p /opt/whatsapp-chatbot/nginx/certs
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/certs/
```

#### 4. Update nginx.conf

```bash
sed -i 's/YOUR_DOMAIN_HERE/yourdomain.com/g' nginx/nginx.conf
```

#### 5. Set Up Auto-Renewal

Install the provided renewal hook (`scripts/renew-ssl.sh` copies renewed certs and reloads nginx):

```bash
sudo ln -s /opt/whatsapp-chatbot/scripts/renew-ssl.sh \
  /etc/letsencrypt/renewal-hooks/deploy/whatsapp-chatbot.sh

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

Certbot auto-renewal runs via systemd timer. Verify with:
```bash
systemctl list-timers | grep certbot
```

</details>

### Option C: Existing Certificates

Place your certificate files at:

```
nginx/certs/fullchain.pem
nginx/certs/privkey.pem
```

Then run `sed -i 's/YOUR_DOMAIN_HERE/yourdomain.com/g' nginx/nginx.conf` and start containers.

---

## First-Time Deployment

### 1. Build and Start All Containers

```bash
cd /opt/whatsapp-chatbot

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This will:
- Pull `postgres:16-alpine`, `redis:7-alpine`, and `n8nio/n8n:latest` images
- Build the API image (multi-stage: install deps → generate Prisma → compile TypeScript → production image)
- Build the Dashboard image (multi-stage: install deps → build Next.js → production image)
- Build the Nginx image
- Start all containers in dependency order (postgres → redis → api → dashboard → nginx)

### 2. Verify Containers Are Running

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output: all 8 containers with status `Up (healthy)` or `Up`.

### 3. Check Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f dashboard
docker compose -f docker-compose.prod.yml logs -f nginx
```

### 4. Verify Health

```bash
# API health check (from inside the server)
curl http://localhost:4000/health

# Via public URL
curl https://yourdomain.com/health
```

### 5. Create Search Indexes

After the first deployment, create the PostgreSQL trigram indexes for product search:

```bash
docker exec wab-postgres psql -U whatsapp_bot -d whatsapp_bot -c "
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS \"Product_name_trgm_idx\" ON \"Product\" USING GIN (\"name\" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS \"Product_description_trgm_idx\" ON \"Product\" USING GIN (\"description\" gin_trgm_ops);
"
```

### 6. Seed Initial Data (Optional)

If deploying a fresh instance and want demo data:

```bash
docker exec wab-api sh -c "cd /app/apps/api && ./node_modules/.bin/prisma db seed"
```

For production, skip the seed and register your first tenant via the dashboard:

1. Navigate to `https://yourdomain.com/register`
2. Fill in: **Business Name**, **Your Name**, **Email**, **Password**
3. Click **Create Account** — you'll be logged in automatically

Or via the API:

```bash
curl -X POST https://yourdomain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "My Business",
    "email": "admin@mybusiness.com",
    "password": "your-strong-password",
    "name": "Admin User"
  }'
```

---

## Subsequent Deployments

### Zero-Downtime Deploy Script

The project includes a deploy script that rebuilds and restarts containers one at a time:

```bash
./scripts/deploy.sh
```

**What it does:**
1. `git pull origin main` — Fetches the latest code
2. Builds the API container image
3. Restarts the API container (database migrations run automatically on startup)
4. Builds the Dashboard container image
5. Restarts the Dashboard container
6. Prunes old Docker images
7. Shows container status

### Manual Deploy (Selective)

If you only changed the API:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build api
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api
```

If you only changed the Dashboard:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build dashboard
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps dashboard
```

If you changed Nginx config:

```bash
# Reload without restart
docker exec wab-nginx nginx -s reload

# Or full restart
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps nginx
```

### Database Migration on Deploy

The API Dockerfile runs `npx prisma migrate deploy` automatically on container start. This applies any pending migrations from `apps/api/prisma/migrations/`. No manual migration step is needed during deployment.

---

## Container Details

### API Container (`wab-api`)

- **Build:** Single-stage Dockerfile at `apps/api/Dockerfile`
  - Installs all deps (including dev), generates Prisma client, compiles TypeScript, then runs in the same image
  - TypeScript output path: `dist/apps/api/src/server.js` (TypeScript computes common root of `apps/api/src` and `packages/shared/src`, so `outDir: dist` resolves to a nested path)
- **Startup:** Runs `./node_modules/.bin/prisma migrate deploy` then `node dist/apps/api/src/server.js`
  - Prisma binary is at the workspace package level (`apps/api/node_modules/.bin/`), not hoisted to root
- **BullMQ Worker:** Runs in the same process (not a separate container). The webhook processing worker starts after Express is listening.
- **Health check:** `GET /health` on port 4000 every 30s

### Dashboard Container (`wab-dashboard`)

- **Build:** Multi-stage Dockerfile at `apps/dashboard/Dockerfile`
  - Stage 1 (builder): Installs deps, builds Next.js (`next build`)
  - Stage 2 (runner): Production deps only, copies `.next` output
- **Startup:** Runs `pnpm start` (which runs `next start` on port 3001)
- **Environment:** `NEXT_PUBLIC_API_URL` is baked in at build time. To change the API URL, you must rebuild the container.
- **Health check:** `wget -qO- http://localhost:3001` every 30s

### PostgreSQL Container (`wab-postgres`)

- **Image:** `postgres:16-alpine`
- **Data:** Persisted in Docker volume `pgdata`
- **Health check:** `pg_isready` every 10s
- **Port:** 5432 (internal only, not exposed to host)

### Redis Container (`wab-redis`)

- **Image:** `redis:7-alpine`
- **Auth:** Password required (set via `REDIS_PASSWORD`)
- **Data:** Persisted in Docker volume `redisdata`
- **Health check:** `redis-cli ping` every 10s
- **Purpose:** BullMQ job queue (webhook processing) and cache layer (tenant policies, templates, product categories)

### n8n Container (`wab-n8n`)

- **Image:** `n8nio/n8n:latest`
- **Auth:** Basic auth protected (set via `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`)
- **Data:** Persisted in Docker volume `n8ndata`
- **Database:** Shares the PostgreSQL instance
- **Access:** Available at `https://yourdomain.com/n8n/`

---

## Nginx Reverse Proxy

### Route Mapping

| Path | Upstream | Rate Limit | Notes |
|------|----------|------------|-------|
| `/webhook/whatsapp` | api:4000 | None | Meta requires reliable 200 responses |
| `/auth/login`, `/auth/register`, `/auth/refresh` | api:4000 | 1 req/sec (burst 5) | Strict auth rate limiting |
| `/billing/stripe-webhook` | api:4000 | None | Stripe webhook endpoint |
| `/metrics` | api:4000 | N/A | Internal IPs only (127.0.0.1, 10.x, 172.16.x, 192.168.x) |
| `/tenant/*`, `/products/*`, etc. | api:4000 | 30 req/sec (burst 50) | All other API routes |
| `/n8n/*` | n8n:5678 | None | WebSocket support for n8n UI |
| `/grafana/*` | grafana:3000 | None | Grafana dashboards (auth via Grafana login) |
| `/*` (catch-all) | dashboard:3001 | None | Next.js frontend |

### Security Headers

Nginx adds the following headers to all responses:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Body Size Limit

`client_max_body_size` is set to `10m` to accommodate CSV product imports and webhook payloads.

---

## Database Management

### Backups

#### Automated Backups

Set up a cron job to run the backup script daily:

```bash
# Create backup directory on host
sudo mkdir -p /backups
sudo chown $USER:$USER /backups

# Add cron job (runs at 2 AM daily)
crontab -e
```

Add this line:
```
0 2 * * * docker exec wab-postgres sh -c 'PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -U whatsapp_bot -d whatsapp_bot | gzip' > /backups/whatsapp_bot_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz 2>> /var/log/db-backup.log
```

#### Manual Backup

```bash
docker exec wab-postgres sh -c 'PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -U whatsapp_bot -d whatsapp_bot' | gzip > backup_$(date +%Y%m%d).sql.gz
```

#### Restore from Backup

```bash
# Stop the API to prevent writes
docker compose -f docker-compose.prod.yml stop api

# Restore
gunzip -c backup_20260219.sql.gz | docker exec -i wab-postgres psql -U whatsapp_bot -d whatsapp_bot

# Restart API
docker compose -f docker-compose.prod.yml start api
```

#### Backup Retention

The `scripts/backup-db.sh` script retains backups for 7 days. Adjust `RETAIN_DAYS` in the script to change this.

For off-site backups, copy files to cloud storage:

```bash
# Example: sync to S3
aws s3 sync /backups/ s3://your-bucket/db-backups/ --storage-class STANDARD_IA
```

### Database Migrations

Migrations are applied automatically when the API container starts. To run manually:

```bash
docker exec wab-api sh -c "cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy"
```

To check migration status:

```bash
docker exec wab-api sh -c "cd /app/apps/api && ./node_modules/.bin/prisma migrate status"
```

### Connect to Database Shell

```bash
docker exec -it wab-postgres psql -U whatsapp_bot -d whatsapp_bot
```

---

## Monitoring

### Health Checks

All containers have built-in health checks. Docker will automatically restart unhealthy containers (due to `restart: unless-stopped`).

```bash
# Check all container health
docker compose -f docker-compose.prod.yml ps

# Inspect specific container health
docker inspect --format='{{json .State.Health}}' wab-api | jq
```

### Grafana Dashboard

Grafana is included in the production stack and starts automatically. Access it at:

```
https://yourdomain.com/grafana/
```

Default login: `admin` / `GRAFANA_PASSWORD` (set in `.env.production`).

The **WhatsApp Bot — Overview** dashboard is pre-provisioned with 8 panels:

| Panel | What it shows |
|-------|---------------|
| HTTP Request Rate | Requests/sec by route |
| HTTP 5xx Error Rate | Error percentage — alert fires at > 1% |
| Webhook Processing Latency | p50 and p95 of inbound message pipeline |
| Queue Depth | BullMQ jobs currently waiting |
| Messages Processed by Intent | Breakdown of greeter/refund/tracking/etc. |
| AI Requests Rate & Errors | Success vs error counts per provider |
| AI p95 Latency | AI call latency by provider and type |
| Quota Violations by Type | Rate of inbound/outbound/AI quota hits |

### Prometheus Alert Rules

Five alert rules are evaluated by Prometheus every 15 seconds (`monitoring/alert.rules.yml`):

| Alert | Condition | Severity |
|-------|-----------|----------|
| `HighApiErrorRate` | 5xx rate > 1% for 5m | critical |
| `SlowWebhookProcessing` | p95 latency > 5s for 5m | warning |
| `WebhookQueueBackup` | queue depth > 100 for 2m | warning |
| `FrequentQuotaViolations` | quota events > 0.1/s per tenant | warning |
| `HighAiErrorRate` | AI error rate > 10% per provider | warning |

**To receive notifications**, configure a contact point in Grafana:

1. Go to **Alerting → Contact points → Add contact point**
2. Choose type: Email, Slack, PagerDuty, webhook, etc.
3. Go to **Alerting → Notification policies** and route alerts to your contact point

> Prometheus evaluates the rules; Grafana unified alerting fires notifications. No separate Alertmanager is needed.

### Available Metrics

The API exposes metrics at `GET /metrics` (internal-only via nginx). Prometheus scrapes it directly on the Docker internal network (`api:4000/metrics`).

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | method, route, status |
| `whatsapp_webhooks_total` | Counter | status |
| `whatsapp_messages_processed_total` | Counter | tenant_id, intent |
| `message_processing_duration_seconds` | Histogram | tenant_id |
| `whatsapp_send_total` | Counter | tenant_id, status, type |
| `webhook_queue_depth` | Gauge | — |
| `quota_exceeded_total` | Counter | tenant_id, quota_type |
| `ai_requests_total` | Counter | provider, type, status |
| `ai_request_duration_seconds` | Histogram | provider, type |
| Node.js defaults | Various | process_*, nodejs_* |

To inspect raw metrics from the server:

```bash
# From inside the server (Prometheus scrapes this)
curl http://localhost:4000/metrics
```

### Log Monitoring

```bash
# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# Follow specific service with timestamps
docker compose -f docker-compose.prod.yml logs -f --timestamps api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

The API uses Pino structured JSON logging in production. You can pipe to `pino-pretty` for readability:

```bash
docker compose -f docker-compose.prod.yml logs api | npx pino-pretty
```

### Disk Space

Prometheus retains 15 days of metrics by default (configurable in `monitoring/prometheus.yml` via `--storage.tsdb.retention.time`).

```bash
# Docker disk usage (includes volumes)
docker system df

# Clean up unused images/containers
docker system prune -f

# Check volume sizes
docker volume ls
```

---

## WhatsApp Business API Setup

### 1. Create a Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create or use an existing business account
3. Go to [Meta Developers](https://developers.facebook.com/) and create an app (type: Business)
4. Add the **WhatsApp** product to your app

### 2. Get API Credentials

From the WhatsApp section in Meta Developer Portal:
- **Phone Number ID** — Identifies your WhatsApp business number
- **WhatsApp Business Account ID**
- **Permanent Access Token** — Generate a System User token with `whatsapp_business_messaging` permission

### 3. Configure Webhook in Meta

1. In Meta Developer Portal → WhatsApp → Configuration
2. Set **Callback URL:** `https://yourdomain.com/webhook/whatsapp`
3. Set **Verify Token:** Same value as `WEBHOOK_VERIFY_TOKEN` in your `.env.production`
4. Subscribe to fields: `messages`

### 4. Connect WhatsApp to Your Tenant

After registering and logging in, connect WhatsApp via the API:

```bash
TOKEN="<your-jwt-token>"
curl -X POST https://yourdomain.com/tenant/whatsapp/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "<meta-phone-number-id>",
    "whatsappBusinessAccountId": "<waba-id>",
    "accessToken": "<permanent-access-token>"
  }'
```

Or configure via the Dashboard under **Settings > WhatsApp Configuration**.

---

## Stripe Billing Setup

### 1. Create Stripe Products

In your [Stripe Dashboard](https://dashboard.stripe.com/):

1. Create two Products:
   - **PRO Plan** — Monthly recurring price
   - **BUSINESS Plan** — Monthly recurring price
2. Copy the Price IDs (`price_...`) for each plan
3. Set them in `.env.production` as `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_BUSINESS`

### 2. Configure Stripe Webhook

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/billing/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### 3. Test with Stripe CLI (Optional)

```bash
stripe listen --forward-to https://yourdomain.com/billing/stripe-webhook
```

---

## n8n Automation Setup

### 1. Access n8n

Navigate to `https://yourdomain.com/n8n/` and log in with the credentials set in `.env.production`.

### 2. Import Workflows

See [docs/N8N_WORKFLOWS.md](N8N_WORKFLOWS.md) for workflow setup instructions covering:
- Case creation automation
- SLA alert workflows
- Customer notification workflows

See [docs/N8N_ORDER_DELIVERED_WORKFLOW.md](N8N_ORDER_DELIVERED_WORKFLOW.md) for the post-delivery feedback workflow.

### 3. Configure n8n Webhook URLs

All n8n webhooks should call the API using the internal Docker network URL:

```
http://api:4000/automation/webhook
```

Include the `AUTOMATION_API_KEY` header for authentication.

---

## AI Provider Setup

### Enable AI Intent Detection & Response

1. Choose a provider: `anthropic`, `openai`, or `gemini`
2. Set environment variables in `.env.production`:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
# AI_MODEL=claude-3-5-haiku-20241022   # optional override
# AI_TIMEOUT_MS=5000                    # optional timeout
```

3. Rebuild and restart the API container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api
```

4. Enable AI per tenant via the Dashboard under **Settings > Policies** or via API:

```bash
curl -X PUT https://yourdomain.com/tenant/policies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aiEnabled": true}'
```

### AI Flow

1. Inbound message → 8 regex-based rules run first
2. If no rule matches and tenant has `aiEnabled: true` → check AI quota
3. AI intent detection → template lookup → if no template matches → AI response generation
4. Usage tracked per tenant per month (`aiCallsCount`)

### Per-Plan AI Quotas

| Plan | Monthly AI Calls |
|------|-----------------|
| FREE | 50 |
| PRO | 1,000 |
| BUSINESS | 10,000 |

---

## Security Hardening

### Checklist

- [ ] All secrets in `.env.production` are unique, strong, randomly generated
- [ ] `.env.production` has `chmod 600` permissions
- [ ] `.env.production` is in `.gitignore` (never committed)
- [ ] Firewall only allows ports 22, 80, 443
- [ ] SSH uses key-based auth (password auth disabled)
- [ ] Nginx HSTS header is enabled (default in config)
- [ ] WhatsApp webhook signature verification is active
- [ ] Stripe webhook signature verification is active
- [ ] n8n is behind basic auth
- [ ] Grafana is behind its own login (set `GRAFANA_PASSWORD` to a strong password)
- [ ] `/metrics` endpoint is restricted to internal IPs
- [ ] Rate limiting is active on auth endpoints (1 req/sec)
- [ ] Rate limiting is active on API endpoints (30 req/sec)
- [ ] WhatsApp access tokens are AES-256-GCM encrypted at rest
- [ ] Database is not exposed to the internet (internal Docker network only)
- [ ] Redis requires password authentication

### Encryption Key Rotation

The system supports key rotation with versioned ciphertext (`v1$<ciphertext>` prefix):

1. Set `ENCRYPTION_KEY_v1` to your **current** key
2. Set `ENCRYPTION_KEY` to the **new** key
3. Restart the API container
4. New encryptions use the new key; old ciphertexts are decrypted with `ENCRYPTION_KEY_v1`

---

## Scaling Considerations

### Current Architecture (Single VPS)

The default deployment runs all services on a single server. This handles moderate traffic well:
- ~100 concurrent WhatsApp conversations
- ~50 dashboard users
- ~1000 messages/minute throughput

### Scaling Up (Vertical)

Increase server resources (CPU, RAM). The simplest approach for growing traffic.

### Scaling Out (Horizontal)

For high-traffic deployments:

1. **Managed PostgreSQL** — Move to a managed database (AWS RDS, DigitalOcean Managed DB)
2. **Managed Redis** — Move to a managed Redis (AWS ElastiCache, DigitalOcean Managed Redis)
3. **Multiple API Instances** — Run multiple `wab-api` containers behind Nginx (update upstream config)
4. **Separate BullMQ Worker** — Extract the worker into its own container for independent scaling
5. **CDN** — Put the dashboard behind a CDN (Cloudflare, CloudFront)

### Docker Volume Persistence

Production data is stored in Docker volumes:
- `pgdata` — PostgreSQL data
- `redisdata` — Redis data
- `n8ndata` — n8n workflows and credentials

| Volume | Container | Contents |
|--------|-----------|----------|
| `pgdata` | postgres | PostgreSQL data files |
| `redisdata` | redis | Redis AOF/RDB snapshots |
| `n8ndata` | n8n | n8n workflows and credentials |
| `prometheusdata` | prometheus | TSDB (15-day retention) |
| `grafanadata` | grafana | Grafana DB, users, alert state |

These volumes persist across container restarts and rebuilds. They are deleted only with `docker compose down -v`.

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for the failing container
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs dashboard

# Check health status
docker inspect --format='{{json .State.Health}}' wab-api | jq
```

### API Returns 502 Bad Gateway

The API container is not ready or has crashed:

```bash
# Check if API is running
docker compose -f docker-compose.prod.yml ps api

# Check API logs
docker compose -f docker-compose.prod.yml logs --tail=50 api

# Restart API
docker compose -f docker-compose.prod.yml --env-file .env.production restart api
```

### Database Connection Errors

```bash
# Check if PostgreSQL is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Test connection from API container
docker exec wab-api sh -c "wget -qO- http://localhost:4000/health"

# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres
```

### SSL Certificate Issues

```bash
# Test SSL
curl -vI https://yourdomain.com

# Check certificate expiry
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew certificate
sudo certbot renew
```

### Redis Connection Issues

```bash
# Check Redis container
docker compose -f docker-compose.prod.yml ps redis

# Test Redis connection
docker exec wab-redis redis-cli -a <your-redis-password> ping
# Expected: PONG
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -af
docker volume prune -f  # WARNING: removes unused volumes

# Check large log files
docker compose -f docker-compose.prod.yml logs --tail=1 api 2>&1 | wc -c
```

### Rebuild Everything from Scratch

```bash
# Stop all containers
docker compose -f docker-compose.prod.yml down

# Rebuild all images (no cache)
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Start
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## Rollback Procedure

### Rollback Code

```bash
# Find the last working commit
git log --oneline -10

# Checkout the working commit
git checkout <commit-hash>

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production build api dashboard
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api dashboard
```

### Rollback Database

If a migration caused issues:

```bash
# Stop API
docker compose -f docker-compose.prod.yml stop api

# Restore from backup
gunzip -c /backups/whatsapp_bot_<timestamp>.sql.gz | docker exec -i wab-postgres psql -U whatsapp_bot -d whatsapp_bot

# Checkout code to matching version
git checkout <commit-before-migration>

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production build api
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

---

## Quick Reference

### Common Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# View running containers
docker compose -f docker-compose.prod.yml ps

# Follow logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a specific service
docker compose -f docker-compose.prod.yml --env-file .env.production restart api

# Rebuild a specific service
docker compose -f docker-compose.prod.yml --env-file .env.production build api
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api

# Zero-downtime deploy
./scripts/deploy.sh

# Manual backup
docker exec wab-postgres sh -c 'PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -U whatsapp_bot -d whatsapp_bot' | gzip > backup_$(date +%Y%m%d).sql.gz

# Connect to database
docker exec -it wab-postgres psql -U whatsapp_bot -d whatsapp_bot

# Check API health
curl https://yourdomain.com/health
```
