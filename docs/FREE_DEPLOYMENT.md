# Free Deployment Guide — From Zero

Deploy the WhatsApp Bot SaaS **completely free** with no VPS needed.
After setup, every `git push` auto-deploys everything.

---

## Deployment Progress

| Phase | Step | Status |
|-------|------|--------|
| 1 | GitHub — Push code | ✅ Done |
| 2 | Upstash — Redis | ✅ Done |
| 3 | Render — PostgreSQL + API server | ✅ Done — `https://whatsapp-bot-api-5jjc.onrender.com` |
| 4 | Vercel — Dashboard | ✅ Done — `https://whatsapp-chatbot-dashboard-liart.vercel.app` |
| 5 | Auto-deploy on git push | ✅ Done — Render connected to GitHub |
| 6 | Connect WhatsApp (Meta) | ⬜ Pending |
| 7 | Register first account | ⬜ Pending |

---

## What You'll Create (All Free)

| Account | Purpose | Sign Up Link |
|---------|---------|-------------|
| **GitHub** | Host your code | https://github.com/signup |
| **Upstash** | Redis (queue + cache) | https://upstash.com |
| **Render** | PostgreSQL database + API server | https://render.com |
| **Vercel** | Host your dashboard | https://vercel.com |

**Time needed:** ~30–45 minutes for first-time setup.

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

Run these in your project folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-chatbot.git
git branch -M main
git push -u origin main
```

> If it asks for password — use a Personal Access Token. GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic) → Generate new token → select `repo` scope.

---

## Phase 2 — Upstash (Redis) ✅

### 1. Create Account

1. Go to https://upstash.com
2. Click **Sign up** → choose **Continue with GitHub**

### 2. Create a Redis Database

1. Click **Create database**
2. Name: `whatsapp-bot-redis`
3. Type: **Regional**
4. Region: **Singapore (ap-southeast-1)**
5. Click **Create**

### 3. Copy Your Redis URL

1. Click on your new database
2. Scroll to **Details** section
3. Copy the **REDIS_URL** value — it starts with `rediss://`

```
rediss://default:password@xxx.upstash.io:6379
```

**Save this** as `REDIS_URL`.

---

## Phase 3 — Render (PostgreSQL + API Server) ✅

Render hosts both your database and API in one place.

### 1. Create Account

1. Go to https://render.com
2. Click **Sign up** → choose **Continue with GitHub**

### 2. Create PostgreSQL Database

1. Click **+ New** → **PostgreSQL**
2. Fill in:
   - **Name:** `whatsapp-bot-db`
   - **Database:** `whatsapp_bot`
   - **User:** `whatsapp_bot`
   - **Region:** `Singapore (Southeast Asia)`
   - **Plan:** `Free`
3. Click **Create Database** → wait ~2 minutes
4. Scroll to **Connections** → copy **Internal Database URL**

### 3. Generate Secret Keys

Run this in your terminal (Node.js required):

```bash
node -e "const c=require('crypto'); console.log('JWT_SECRET='+c.randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET='+c.randomBytes(32).toString('hex')); console.log('ENCRYPTION_KEY='+c.randomBytes(32).toString('hex')); console.log('WEBHOOK_VERIFY_TOKEN='+c.randomBytes(16).toString('hex')); console.log('AUTOMATION_API_KEY='+c.randomBytes(24).toString('hex'));"
```

Save all 5 output values.

### 4. Create Web Service (API)

1. Click **+ New** → **Web Service**
2. Connect your `whatsapp-chatbot` GitHub repo
3. Fill in:
   - **Name:** `whatsapp-bot-api`
   - **Region:** `Singapore (Southeast Asia)`
   - **Branch:** `main`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `apps/api/Dockerfile`
   - **Plan:** `Free`
4. Under **Environment Variables**, add all of these:

```
NODE_ENV                = production
API_PORT                = 4000
DATABASE_URL            = <Internal URL from step 2>
REDIS_URL               = <rediss:// URL from Phase 2>
JWT_SECRET              = <generated above>
JWT_REFRESH_SECRET      = <generated above>
ENCRYPTION_KEY          = <generated above>
WEBHOOK_VERIFY_TOKEN    = <generated above>
AUTOMATION_API_KEY      = <generated above>
SMTP_USER               = your-gmail@gmail.com
SMTP_PASS               = xxxx xxxx xxxx xxxx
EMAIL_FROM              = WhatsApp Bot <your-gmail@gmail.com>
AI_PROVIDER             = none
CORS_ORIGIN             = https://your-dashboard.vercel.app
DASHBOARD_URL           = https://your-dashboard.vercel.app
```

> Set `CORS_ORIGIN` and `DASHBOARD_URL` **after** Vercel gives you a URL in Phase 4. You can update them later in Render → Environment tab.

5. Click **Create Web Service** → build takes ~5–10 minutes
6. Once live, your API URL is: `https://whatsapp-bot-api-xxxx.onrender.com`

### 5. Seed Demo Data

After the service is live, seed the database from your local machine:

1. Go to Render → your PostgreSQL database → **Connections** → copy **External Database URL**
2. Run locally:

```bash
# From your project root
cd apps/api
DATABASE_URL="<External Database URL>" ./node_modules/.bin/tsx prisma/seed.ts
```

This creates demo login credentials:
- **Owner:** `owner@acme.test` / `password123`
- **Agent:** `agent@acme.test` / `password123`

---

## Phase 4 — Vercel (Dashboard) ✅

### 1. Create Account

1. Go to https://vercel.com
2. Click **Sign up** → **Continue with GitHub**

### 2. Import Project

1. Click **Add New** → **Project**
2. Select your `whatsapp-chatbot` repo → **Import**
3. Set **Root Directory** to `apps/dashboard`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://whatsapp-bot-api-xxxx.onrender.com
   ```
5. Click **Deploy**

Once deployed, copy your Vercel URL (e.g. `https://whatsapp-chatbot-dashboard-xxxx.vercel.app`).

### 3. Update Render with Dashboard URL

Go to Render → your API service → **Environment** tab → update:
```
CORS_ORIGIN   = https://your-dashboard.vercel.app
DASHBOARD_URL = https://your-dashboard.vercel.app
```

---

## Phase 5 — Auto-Deploy on Git Push ✅

Both Vercel and Render are already connected to your GitHub repo:

- **Vercel** — auto-deploys on every push to `main`
- **Render** — auto-deploys on every push to `main`

No extra setup needed. Just push code and both services update automatically.

```bash
git add .
git commit -m "your change"
git push origin main
# → Vercel rebuilds dashboard (~2 min)
# → Render rebuilds API (~5 min)
```

---

## Phase 6 — Connect WhatsApp ⬜ ← NEXT

### 1. Create Meta Developer Account

1. Go to https://developers.facebook.com
2. Log in with your Facebook account
3. Click **My Apps** → **Create App**
4. Choose type: **Business** → **Next**
5. App name: anything → **Create app**

### 2. Add WhatsApp Product

1. In your app dashboard, scroll to find **WhatsApp** → click **Set up**
2. Create or connect a Meta Business account when prompted

### 3. Get Your Credentials

On the Getting Started page:
- **Phone Number ID** — copy it
- **WhatsApp Business Account ID** — copy it
- Click **Generate** under Temporary access token → copy it

### 4. Configure Webhook

1. Left sidebar → **Configuration**
2. Under **Webhook**, click **Edit**
3. Set:
   - **Callback URL:** `https://whatsapp-bot-api-5jjc.onrender.com/webhook/whatsapp`
   - **Verify token:** the value you set as `WEBHOOK_VERIFY_TOKEN`
4. Click **Verify and save**
5. Under **Webhook fields** → enable `messages` → **Done**

---

## Phase 7 — Register Your First Account ⬜

Open your dashboard URL and register:

```
https://whatsapp-chatbot-dashboard-liart.vercel.app/register
```

Fill in:
- **Business Name:** your company name
- **Your Name:** your name
- **Email:** your email
- **Password:** strong password

Click **Create Account** → you'll be taken to the onboarding wizard where you enter your WhatsApp credentials.

---

## Your Final URLs

| What | URL |
|------|-----|
| Dashboard | `https://whatsapp-chatbot-dashboard-liart.vercel.app` |
| API | `https://whatsapp-bot-api-5jjc.onrender.com` |
| API Health | `https://whatsapp-bot-api-5jjc.onrender.com/health` |
| WhatsApp Webhook | `https://whatsapp-bot-api-5jjc.onrender.com/webhook/whatsapp` |

---

## Add Gmail SMTP (Password Reset Emails)

To enable real password reset emails via Gmail:

1. Enable 2-Step Verification on your Google account
2. Go to Google Account → Security → **App passwords** → create one
3. Add to Render environment variables:

```
SMTP_USER = your-gmail@gmail.com
SMTP_PASS = xxxx xxxx xxxx xxxx
EMAIL_FROM = WhatsApp Bot <your-gmail@gmail.com>
```

If not set, reset links are logged to the API console instead.

---

## Add Stripe Billing (Optional)

1. Create account at https://stripe.com
2. Go to **Developers** → **API keys** → copy **Secret key** (`sk_test_...`)
3. Go to **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://whatsapp-bot-api-5jjc.onrender.com/billing/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_...`)
5. Create two products in Stripe → get their Price IDs (`price_...`)
6. Add to Render environment variables:

```
STRIPE_SECRET_KEY        = sk_test_...
STRIPE_WEBHOOK_SECRET    = whsec_...
STRIPE_PRICE_ID_PRO      = price_...
STRIPE_PRICE_ID_BUSINESS = price_...
```

---

## Enable AI Responses (Optional)

Add to Render environment variables:

```
# Google Gemini (most generous free tier)
AI_PROVIDER  = gemini
GEMINI_API_KEY = AIza...

# Or Anthropic Claude
AI_PROVIDER      = anthropic
ANTHROPIC_API_KEY = sk-ant-...

# Or OpenAI
AI_PROVIDER   = openai
OPENAI_API_KEY = sk-...
```

Then enable AI per tenant in **Settings → Policies → Enable AI responses**.

---

## Troubleshooting

### Dashboard shows "Failed to fetch" errors
- Check `NEXT_PUBLIC_API_URL` in Vercel matches your Render URL exactly (no trailing slash)
- Check `CORS_ORIGIN` in Render environment matches your Vercel URL exactly

### WhatsApp webhook verification fails
- The `WEBHOOK_VERIFY_TOKEN` in Render environment must exactly match what you typed in Meta Developer Portal

### API is slow to respond (first request)
- Free Render instances sleep after 15 min of inactivity — first request takes ~30–50 seconds to wake up
- Subsequent requests are fast
- Upgrade to Render Starter ($7/month) for always-on behavior

### Build fails on Render
- Check Render → your service → **Logs** tab for error details
- Most common: missing environment variable

### Can't log in after fresh deployment
- The database is empty on first deploy — run the seed script (see Phase 3, Step 5)
- Or register a new account at `/register`
