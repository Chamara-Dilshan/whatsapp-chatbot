# Free Deployment Guide — From Zero

Deploy the WhatsApp Bot SaaS **completely free** with no VPS needed.
After setup, every `git push` auto-deploys everything.

---

## Deployment Progress

| Phase | Step | Status |
|-------|------|--------|
| 1 | GitHub — Push code | ✅ Done |
| 2 | Neon — PostgreSQL database | ✅ Done |
| 3 | Upstash — Redis | ✅ Done |
| 4 | Fly.io — API server | ✅ Done — `https://chamara-whatsapp-api.fly.dev` |
| 5 | Vercel — Dashboard | ⬜ Next |
| 6 | Auto-deploy on git push | ⬜ Pending (needs FLY_API_TOKEN in GitHub Secrets) |
| 7 | Connect WhatsApp (Meta) | ⬜ Pending |
| 8 | Register first account | ⬜ Pending |

---

## What You'll Create (All Free)

| Account | Purpose | Sign Up Link |
|---------|---------|-------------|
| **GitHub** | Host your code | https://github.com/signup |
| **Neon** | PostgreSQL database | https://neon.tech |
| **Upstash** | Redis (queue + cache) | https://upstash.com |
| **Fly.io** | Run your API server | https://fly.io |
| **Vercel** | Host your dashboard | https://vercel.com |

**Time needed:** ~45–60 minutes for first-time setup.

---

## Phase 1 — GitHub (Push Your Code) ✅

You need your code on GitHub so the other platforms can pull it.

### 1. Create GitHub Account

1. Go to https://github.com/signup
2. Enter username, email, password → **Create account**
3. Verify your email

### 2. Create a Repository

1. Click **+** (top right) → **New repository**
2. Name it: `whatsapp-chatbot`
3. Set to **Private** (recommended)
4. Leave everything else default → **Create repository**

### 3. Push Your Local Code

Run these in your project folder (`d:\Projects\whatsapp-chatbot`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-chatbot.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

> If it asks for password — GitHub no longer accepts passwords for push.
> Go to GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic) → Generate new token → select `repo` scope → use that token as the password.

---

## Phase 2 — Neon (PostgreSQL Database) ✅

### 1. Create Account

1. Go to https://neon.tech
2. Click **Sign up** → choose **Continue with GitHub** (easiest)
3. Authorize Neon to access GitHub

### 2. Create a Project

1. Click **New project**
2. Name: `whatsapp-bot`
3. Region: choose closest to you (e.g. `AWS ap-southeast-1` for Asia)
4. Click **Create project**

### 3. Copy Your Database URL

After creation, you'll see a **Connection string** like:

```
postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Copy and save this** — you'll need it soon as `DATABASE_URL`.

> Click the eye icon to reveal the password, then copy the full string.

---

## Phase 3 — Upstash (Redis) ✅

### 1. Create Account

1. Go to https://upstash.com
2. Click **Sign up** → choose **Continue with GitHub**
3. Authorize Upstash

### 2. Create a Redis Database

1. Click **Create database**
2. Name: `whatsapp-bot`
3. Type: **Regional** (not Global)
4. Region: same as your Neon database
5. Click **Create**

### 3. Copy Your Redis URL

1. Click on your new database
2. Scroll to **REST API** section → click **Redis** tab
3. Copy the **UPSTASH_REDIS_URL** value — it looks like:

```
rediss://default:password@global-xxx.upstash.io:6379
```

**Save this** as `REDIS_URL`.

---

## Phase 4 — Fly.io (API Server) ✅

### 1. Create Account

1. Go to https://fly.io
2. Click **Sign up** → choose **Continue with GitHub**
3. Verify your email

> Fly.io may ask for a credit card to prevent abuse — but the free tier is genuinely free.
> You won't be charged as long as you stay within free limits (1 shared VM).

### 2. Install Fly CLI

**Windows (PowerShell — run as Administrator):**
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Or download the installer directly:**
https://fly.io/docs/hands-on/install-flyctl/

After install, close and reopen your terminal, then log in:

```bash
fly auth login
```

This opens a browser — click **Continue** to authenticate.

### 3. Create the Fly App

In your project root (`d:\Projects\whatsapp-chatbot`), run:

```bash
fly launch --no-deploy
```

When prompted:
- **App name:** pick something unique like `myshop-whatsapp-api`
- **Region:** pick closest (e.g. `sin` for Singapore, `lax` for LA, `fra` for Frankfurt)
- **Would you like to set up a Postgresql database?** → **No** (we use Neon)
- **Would you like to set up an Upstash Redis database?** → **No** (we use Upstash)
- **Would you like to deploy now?** → **No**

This creates a `fly.toml` file in your project root (already created for you — see below).

### 4. Generate Your Secret Keys

Run each command and **save the output**:

```bash
# Windows PowerShell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Run 3 times to get JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY

# Or if you have OpenSSL:
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET (must be different)
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 16   # → AUTOMATION_API_KEY
```

> You need 4 different random strings. Keep them safe — losing them means users can't log in.

### 5. Set All Secrets on Fly.io

Replace the placeholder values with your actual values:

```bash
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..." \
  JWT_SECRET="paste-your-generated-value-here" \
  JWT_REFRESH_SECRET="paste-different-generated-value-here" \
  ENCRYPTION_KEY="paste-your-generated-value-here" \
  WEBHOOK_VERIFY_TOKEN="choose-any-string-like-myshop123" \
  AUTOMATION_API_KEY="paste-your-generated-value-here" \
  AI_PROVIDER="none" \
  NODE_ENV="production"
```

> `CORS_ORIGIN` and `DASHBOARD_URL` — set these **after** Vercel gives you a URL in Phase 5.

### 6. First Deploy

```bash
fly deploy --remote-only
```

> Use `--remote-only` so the Docker image is built on Fly.io's remote builder (not locally). This avoids Windows file-permission issues that can corrupt the build context.

This takes 5–8 minutes on first run. You'll see build logs streaming.

If the deploy fails health checks after the image builds successfully, force it with the immediate strategy:

```bash
fly deploy --remote-only --strategy immediate
```

When it finishes, run:

```bash
fly status
```

Your API is live at: `https://your-app-name.fly.dev`

> **Migrations run automatically.** The API runs `prisma migrate deploy` on every startup — no manual migration step needed.

---

## Phase 5 — Vercel (Dashboard) ⬜ ← NEXT

### 1. Create Account

1. Go to https://vercel.com
2. Click **Sign up** → **Continue with GitHub**
3. Authorize Vercel

### 2. Import Your Project

1. Click **Add New** → **Project**
2. Find your `whatsapp-chatbot` repo → click **Import**
3. On the configuration screen:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** click **Edit** → type `apps/dashboard` → **Continue**
4. Expand **Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-app-name.fly.dev` |

5. Click **Deploy**

Dashboard deploys in ~2–3 minutes. You'll get a URL like:
`https://whatsapp-chatbot-abc123.vercel.app`

### 3. Update Fly.io with Vercel URL

Now that you have your Vercel URL, update the API secrets:

```bash
fly secrets set \
  CORS_ORIGIN="https://whatsapp-chatbot-abc123.vercel.app" \
  DASHBOARD_URL="https://whatsapp-chatbot-abc123.vercel.app"
```

---

## Phase 6 — Auto-Deploy on Git Push ⬜

Vercel already auto-deploys when you push to `main`. Now set up the same for Fly.io.

### 1. Get Fly.io Deploy Token

```bash
fly tokens create deploy
```

Copy the token output (starts with `FlyV1 ...`).

### 2. Add Token to GitHub

1. Go to your GitHub repo → **Settings** tab
2. Left sidebar → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FLY_API_TOKEN`
5. Value: paste the token
6. Click **Add secret**

The GitHub Actions deploy workflow is already created at `.github/workflows/deploy-api.yml`.
It triggers automatically on every push to `main` that changes API or shared code.

---

## Phase 7 — Connect WhatsApp ⬜

### 1. Create Meta Developer Account

1. Go to https://developers.facebook.com
2. Log in with your Facebook account (or create one)
3. Click **My Apps** → **Create App**
4. Choose type: **Business** → **Next**
5. App name: anything → **Create app**

### 2. Add WhatsApp Product

1. In your app dashboard, scroll to find **WhatsApp** → click **Set up**
2. Create or connect a Meta Business account when prompted
3. You'll land on the **WhatsApp Getting Started** page

### 3. Get Your Credentials

On the Getting Started page, you'll see:
- **Phone Number ID** — copy it
- **WhatsApp Business Account ID** — copy it
- Click **Generate** under Temporary access token → copy it

> For production use, create a permanent System User token instead of the temporary one.

### 4. Configure Webhook

1. Left sidebar → **Configuration**
2. Under **Webhook**, click **Edit**
3. Set:
   - **Callback URL:** `https://your-app-name.fly.dev/webhook/whatsapp`
   - **Verify token:** the same value you set as `WEBHOOK_VERIFY_TOKEN` in Fly.io secrets
4. Click **Verify and save**
5. Under **Webhook fields**, click **Manage** → enable `messages` → **Done**

---

## Phase 8 — Register Your First Account ⬜

Open your Vercel dashboard URL:

```
https://whatsapp-chatbot-abc123.vercel.app/register
```

Fill in:
- **Business Name:** your company name
- **Your Name:** your name
- **Email:** your email
- **Password:** strong password

Click **Create Account** — you'll be taken to the onboarding wizard.

In the wizard, enter the WhatsApp credentials from Phase 7.

---

## Your Final URLs

| What | URL |
|------|-----|
| Dashboard | `https://whatsapp-chatbot-abc123.vercel.app` |
| API | `https://your-app-name.fly.dev` |
| API Health | `https://your-app-name.fly.dev/health` |
| WhatsApp Webhook | `https://your-app-name.fly.dev/webhook/whatsapp` |

### Demo Deployment URLs

| What | URL |
|------|-----|
| API | `https://chamara-whatsapp-api.fly.dev` |
| API Health | `https://chamara-whatsapp-api.fly.dev/health` |
| WhatsApp Webhook | `https://chamara-whatsapp-api.fly.dev/webhook/whatsapp` |

---

## Daily Workflow (After Setup)

```bash
# Make changes to code
git add .
git commit -m "your message"
git push origin main

# → Vercel auto-builds dashboard in ~2 min
# → GitHub Action auto-deploys API to Fly.io in ~4 min
# → Done ✅
```

---

## Useful Commands

```bash
# View live API logs
fly logs

# Check if API is running
fly status

# SSH into API container
fly ssh console

# Restart a stopped machine (after max crash retries)
fly machine start <machine-id>

# Update a secret
fly secrets set KEY="new-value"

# Check all set secrets (names only, not values)
fly secrets list

# Run migrations manually (if ever needed)
fly ssh console -C "cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy"

# Check migration status
fly ssh console -C "cd /app/apps/api && ./node_modules/.bin/prisma migrate status"
```

---

## Add Stripe Billing (Optional)

1. Create account at https://stripe.com
2. Go to **Developers** → **API keys** → copy **Secret key** (starts with `sk_test_`)
3. Go to **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://your-app-name.fly.dev/billing/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)
5. Create two products in Stripe → get their Price IDs (start with `price_`)
6. Set secrets on Fly.io:

```bash
fly secrets set \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_ID_PRO="price_..." \
  STRIPE_PRICE_ID_BUSINESS="price_..."
```

---

## Enable AI Responses (Optional)

Pick one AI provider — all have free tiers:

```bash
# Anthropic (Claude)
fly secrets set AI_PROVIDER="anthropic" ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI
fly secrets set AI_PROVIDER="openai" OPENAI_API_KEY="sk-..."

# Google Gemini (most generous free tier)
fly secrets set AI_PROVIDER="gemini" GEMINI_API_KEY="AIza..."
```

Then enable AI per tenant in **Settings → Policies → Enable AI responses**.

---

## Troubleshooting

### "fly: command not found" after installing
Close your terminal completely and reopen it, then try again.

### Deploy fails with build error
```bash
fly logs   # check what went wrong
```
Most common: missing environment variable. Run `fly secrets list` to verify all are set.

### Dashboard shows "Failed to fetch" errors
- Check `NEXT_PUBLIC_API_URL` in Vercel matches your Fly.io URL exactly (no trailing slash)
- Check `CORS_ORIGIN` in Fly.io secrets matches your Vercel URL exactly

### WhatsApp webhook verification fails
- The `WEBHOOK_VERIFY_TOKEN` in Fly.io secrets must exactly match what you typed in Meta Developer Portal
- No spaces, no quotes — just the raw string

### API crashes on startup
```bash
fly logs
```
Common causes:

**Missing environment variable** — check all secrets are set:
```bash
fly secrets list
```

**Database URL issue** — copy it fresh from Neon:
```bash
fly secrets set DATABASE_URL="postgresql://..."
```

**Machine hit max restart count** — start it manually:
```bash
fly machine list   # get machine ID
fly machine start <machine-id>
```

**Health check timeout on rolling deploy** — use immediate strategy:
```bash
fly deploy --remote-only --strategy immediate
```

### Technical notes for developers

- **TypeScript output path:** The API tsconfig has no `rootDir`. TypeScript computes the common root of `apps/api/src` and `packages/shared/src` (because of the path alias), resulting in output at `dist/apps/api/src/server.js` — not `dist/server.js`.
- **Prisma binary in pnpm workspace:** With pnpm's non-hoisting behavior, `prisma` is not available at `/app/node_modules/.bin/prisma`. Use `./node_modules/.bin/prisma` from the WORKDIR `/app/apps/api`.
- **Windows Docker build:** Always use `fly deploy --remote-only` — building locally on Windows can corrupt the build context with file-permission tar errors.
