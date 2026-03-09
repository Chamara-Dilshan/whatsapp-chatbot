# WhatsApp Business Support Bot — Business Model & Sales Process

## What You're Selling

A **WhatsApp Customer Support Automation Tool** (SaaS) for businesses. Think of it like Zendesk or Freshdesk, but specifically for WhatsApp.

---

## Roles Explained

| Role | Who are they? | Example |
|---|---|---|
| **Owner** | The business owner who signs up for the platform | You run "Acme Store" and register on the platform |
| **Admin** | Additional staff added by the owner with full management access | Your store manager |
| **Agent** | Your support staff / employees who handle incoming WhatsApp messages | Your customer support team members |
| **Customer** | End-users who message the business on WhatsApp. They never see the dashboard. | Someone asking about a product or refund via WhatsApp |

---

## The Sales Process

### Step 1: A Business Signs Up
- A business (e.g., clothing store, restaurant, electronics shop) visits your platform
- They register via the dashboard at `/register` (or API at `/auth/register`) — this creates a new **Tenant** (isolated account)
- They become the **Owner** of that tenant

### Step 2: Business Connects Their WhatsApp
- The business goes to **Settings** in the dashboard
- They connect their own **WhatsApp Business API** credentials (from Meta Business Manager)
- Now their WhatsApp number is linked to your platform

### Step 3: Business Sets Up Their Store
- Uploads their **products** (manually or CSV import)
- Configures **policies** (return policy, shipping, business hours)
- Sets up **reply templates** for common questions
- Optionally connects **n8n** for advanced automation

### Step 4: Business Adds Their Support Team
- Owner goes to **Team** page in the dashboard
- Clicks **"+ Add Member"** to create agent accounts (email, name, password, role)
- Plan limits apply: FREE = 1 member (owner only), PRO = 3, BUSINESS = 10
- Agents can then log in at the dashboard and start handling customer conversations

### Step 5: It's Live!
- When a customer messages the business on WhatsApp:
  - The bot **auto-replies** (greetings, product info, FAQs, order tracking)
  - If the bot can't handle it, it **escalates to a human agent**
  - Agents use the **Inbox** to reply
  - **Cases** track complex issues with SLA
  - **Analytics** show performance metrics

---

## Revenue Model (How You Make Money)

| Model | How it works |
|---|---|
| **Monthly Subscription** | Charge per tenant (e.g., $29/mo Basic, $99/mo Pro, $299/mo Enterprise) |
| **Per Agent Pricing** | Charge based on number of agents (e.g., $10/agent/month) |
| **Message Volume** | Charge tiers based on messages handled per month |
| **Freemium** | Free tier with limits, paid for more agents/messages/features |

---

## Multi-Tenant Architecture

```
Your Platform (1 deployment)
├── Tenant 1: "Acme Clothing Store" (their WhatsApp, their products, their agents)
├── Tenant 2: "Best Electronics" (their WhatsApp, their products, their agents)
├── Tenant 3: "Fresh Foods Restaurant" (their WhatsApp, their products, their agents)
└── Tenant 4: ... (unlimited businesses)
```

Each tenant is **completely isolated** — they can't see each other's data. You run **one single platform** serving all of them.

---

## What's Needed to Go Live

| Task | Status |
|---|---|
| Core platform (API + Dashboard) | Done |
| WhatsApp integration | Done |
| Multi-tenant isolation | Done |
| Agent support workflow | Done |
| Product catalog + search | Done |
| Analytics | Done |
| **Landing page / marketing site** | Not built yet |
| **Payment/billing integration** (Stripe) | Done |
| **Tenant registration (public signup)** | Done (dashboard `/register` page + API) |
| **Hosting & deployment** | Need to deploy (AWS, Vercel, Railway, etc.) |
| **Custom domain per tenant** (optional) | Not built yet |
