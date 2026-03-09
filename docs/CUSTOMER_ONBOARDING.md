# Customer Onboarding Guide

Step-by-step guide for businesses (tenants) to get started with the WhatsApp Business Support Bot after the platform is deployed.

---

## Table of Contents

- [Overview](#overview)
- [Step 1: Register Your Business](#step-1-register-your-business)
- [Step 2: Log In to the Dashboard](#step-2-log-in-to-the-dashboard)
- [Step 3: Connect Your WhatsApp Business Number](#step-3-connect-your-whatsapp-business-number)
- [Step 4: Configure Business Policies](#step-4-configure-business-policies)
- [Step 5: Set Language and Tone](#step-5-set-language-and-tone)
- [Step 6: Upload Your Product Catalog](#step-6-upload-your-product-catalog)
- [Step 7: Customize Reply Templates](#step-7-customize-reply-templates)
- [Step 8: Enable AI-Powered Responses (Optional)](#step-8-enable-ai-powered-responses-optional)
- [Step 9: Add Your Support Team](#step-9-add-your-support-team)
- [Step 10: Go Live — Start Receiving Messages](#step-10-go-live--start-receiving-messages)
- [Day-to-Day Operations](#day-to-day-operations)
- [Managing Orders](#managing-orders)
- [Monitoring Performance](#monitoring-performance)
- [Upgrading Your Plan](#upgrading-your-plan)
- [Plan Comparison](#plan-comparison)
- [FAQ](#faq)

---

## Overview

This platform is a WhatsApp Customer Support Automation tool. It connects to your WhatsApp Business number and provides:

- **Automated bot replies** — Instantly answers common questions (greetings, product info, order tracking, business hours, FAQs)
- **Live agent inbox** — When the bot can't help, conversations are handed off to your human support team
- **Product catalog** — Customers can ask about products and get instant responses via WhatsApp
- **Order tracking** — Customers can check order status directly in WhatsApp
- **Case management** — Track complex issues with SLA monitoring
- **Analytics** — Monitor response times, agent performance, and customer satisfaction
- **Multi-language support** — English, Sinhala, and Tamil with auto-detection

---

## Step 1: Register Your Business

### Via the Dashboard

1. Open your browser and go to your platform URL (e.g., `https://yourdomain.com`)
2. On the login page, click **"Sign up"** to go to the registration page
   - Or navigate directly to `https://yourdomain.com/register`
3. Fill in:
   - **Business Name** — Your company name (e.g., "Acme Clothing Store"). A URL-friendly slug is generated automatically.
   - **Your Name** — The account owner's full name
   - **Email** — Your login email address
   - **Password** — A strong password (minimum 8 characters)
4. Click **Create Account**
5. You are automatically logged in and redirected to the dashboard

You are now the **Owner** of your business account. Your business data is completely isolated — no other business can see your conversations, products, or customers.

### Via the API (for developers)

```bash
curl -X POST https://yourdomain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Acme Clothing Store",
    "name": "John Smith",
    "email": "john@acmeclothing.com",
    "password": "your-strong-password"
  }'
```

---

## Step 2: Log In to the Dashboard

1. Go to `https://yourdomain.com/login`
2. Enter your **Email** and **Password**
3. Click **Sign In**
4. You'll be taken to the **Inbox** page

### Dashboard Navigation

The sidebar (left side) provides access to all sections:

| Section | What it does |
|---------|-------------|
| **Inbox** | View and reply to customer WhatsApp conversations |
| **Cases** | Manage support cases with SLA tracking |
| **Products** | Manage your product catalog |
| **Orders** | Manage orders and shipment tracking |
| **Analytics** | View performance metrics and reports |
| **Billing** | Manage your subscription plan and monitor usage |
| **Team** | Add and manage support agents |
| **Settings** | Configure WhatsApp, policies, templates, and AI |

On mobile, tap the hamburger menu (top-left) to open the sidebar.

---

## Step 3: Connect Your WhatsApp Business Number

This is the most important step — it links your WhatsApp Business number to the platform so the bot can receive and send messages.

### Prerequisites

You need a **WhatsApp Business API** account. Here's how to get one:

1. Go to [Meta Business Suite](https://business.facebook.com/) and create a business account (or use an existing one)
2. Go to [Meta Developers](https://developers.facebook.com/) and create an app (type: **Business**)
3. Add the **WhatsApp** product to your app
4. From the WhatsApp setup page, note down:
   - **Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**
   - **Permanent Access Token** — Generate a System User token with `whatsapp_business_messaging` permission
   - **App Secret** — Found under App Settings > Basic

### Connect in the Dashboard

1. Go to **Settings** in the sidebar
2. Under the **WhatsApp Configuration** section, fill in:
   - **Phone Number ID** — From Meta Developer Portal
   - **Display Phone Number** — Your business phone number
   - **WABA ID** — WhatsApp Business Account ID
   - **Access Token** — Your permanent access token (encrypted and stored securely)
   - **App Secret** — For webhook signature verification
   - **Webhook Verify Token** — Any string of your choice (you'll use this in Meta's webhook setup)
3. Click **Connect WhatsApp**
4. A green banner will confirm the connection

### Set Up the Webhook in Meta

After connecting, configure Meta to send messages to your platform:

1. In Meta Developer Portal, go to **WhatsApp > Configuration**
2. Set **Callback URL:** `https://yourdomain.com/webhook/whatsapp`
3. Set **Verify Token:** The same value you entered in the dashboard
4. Click **Verify and Save**
5. Subscribe to the **messages** field

Your WhatsApp is now connected. Test it by sending a message to your business number from any WhatsApp account.

### (Optional) Set Catalog ID

If you use Meta's WhatsApp Commerce catalog:
1. Go to **Settings**
2. Enter your **Catalog ID** in the field
3. Click **Update Catalog**

---

## Step 4: Configure Business Policies

Set up your business information so the bot can answer customer questions accurately.

1. Go to **Settings > Policies** tab
2. Fill in:
   - **Return Policy** — Your return/exchange policy text (the bot uses this when customers ask about returns)
   - **Shipping Policy** — Delivery times, costs, and coverage areas
   - **FAQ Content** — Common questions and answers
   - **Business Hours** — Toggle each day on/off and set open/close times
   - **Timezone** — Your business timezone
   - **Auto Reply Delay** — How long to wait before auto-replying (in milliseconds, e.g., 1000 = 1 second)
3. Click **Save Policies**

The bot uses this information to answer customer questions about business hours, shipping, returns, and FAQs automatically.

---

## Step 5: Set Language and Tone

Configure how the bot communicates with your customers.

1. Go to **Settings > Language & Tone** tab
2. Configure:
   - **Default Language** — The primary language for bot replies
     - **EN** — English
     - **SI** — Sinhala
     - **TA** — Tamil
   - **Tone** — How the bot speaks
     - **FRIENDLY** — Warm, conversational (e.g., "Hi there! How can I help you today?")
     - **FORMAL** — Professional (e.g., "Good day. How may I assist you?")
     - **SHORT** — Brief, minimal (e.g., "Hello. How can I help?")
   - **Auto-detect Language** — When enabled, the bot detects Sinhala/Tamil characters in the customer's message and replies in that language
3. Click **Save Language Settings**

---

## Step 6: Upload Your Product Catalog

Add your products so the bot can answer product inquiries and show product lists.

### Add Products Manually

1. Go to **Products** in the sidebar
2. Click **"+ Add Product"**
3. Fill in:
   - **Retailer ID** — Your internal SKU or product code
   - **Name** — Product name
   - **Description** — Product description
   - **Price** — Numeric price
   - **Currency** — Currency code (e.g., LKR, USD)
   - **Image URL** — Product image link (optional)
   - **Category** — Product category (e.g., "Electronics", "Clothing")
   - **Keywords** — Comma-separated search keywords
   - **In Stock** — Toggle on/off
4. Click **Save**

### Bulk Import via CSV

For many products, use CSV import:

1. Go to **Products**
2. Click **"Import CSV"**
3. Prepare a CSV file with these columns:

```csv
retailerId,name,description,price,currency,imageUrl,category,keywords,inStock
SKU-001,Blue T-Shirt,Comfortable cotton tee,2500,LKR,https://example.com/blue-tee.jpg,Clothing,"tshirt,blue,cotton",true
SKU-002,Red Sneakers,Running shoes size 38-44,8500,LKR,https://example.com/sneakers.jpg,Footwear,"shoes,sneakers,running",true
```

4. Select the file and click **Import**
5. Review results — the system shows success count, skipped count, and any errors

Products are matched by `retailerId` — if a product with the same ID already exists, it will be updated (upsert).

### How Customers Find Products

When a customer messages your WhatsApp number asking about products:
- *"Do you have blue shirts?"* — The bot searches your catalog and replies with matching products
- *"Show me shoes under 5000"* — The bot filters and shows relevant products
- Product search uses fuzzy matching, so typos and partial names work

---

## Step 7: Customize Reply Templates

Templates control how the bot responds to different customer intents. You can create them manually or import them directly from your WhatsApp Business account.

### Option A — Sync from Meta (recommended if you have approved templates)

If you have message templates already approved in Meta Business Manager:

1. Go to **Settings > Templates** tab
2. Click **"Sync from Meta"** — the platform fetches all templates from your WABA
3. Imported templates appear in the table with a **Meta** badge:
   - **APPROVED** (green) — ready to use
   - **PENDING** (yellow) — awaiting Meta approval
   - **REJECTED** (red) — rejected by Meta
4. Only `APPROVED` templates are set to active automatically

> **Prerequisite:** Your WhatsApp connection must have the **WABA ID** filled in (Settings > WhatsApp Configuration).

### Option B — Create Manually

1. Go to **Settings > Templates** tab
2. The system comes with default templates. You can customize them or create new ones.
3. Click **"+ Create Template"** to add a template:
   - **Intent** — When to use this template (e.g., `greeting`, `product_inquiry`, `refund_cancel`, `order_tracking`, `hours_location`, `complaint`, `opt_out`)
   - **Name** — A friendly name for the template
   - **Body** — The message text. Use placeholders for dynamic content:
     - `{{customer_name}}` — Customer's name
     - `{{business_name}}` — Your business name
     - `{{product_name}}` — Product name
     - `{{price}}` / `{{currency}}` — Price info
     - `{{order_id}}` — Order number
     - `{{hours}}` — Business hours
     - `{{shipping_policy}}` / `{{returns_policy}}` — Your policies
     - `{{agent_name}}` — Assigned agent's name
     - `{{today_date}}` / `{{today_time}}` — Current date/time
   - **Language** — EN, SI, or TA
   - **Tone** — FRIENDLY, FORMAL, or SHORT
   - **Active** — Toggle on/off
4. Click **Save**

### Template Matching Logic

When the bot receives a message, it picks the best template using this fallback order:
1. Matching language + matching tone
2. English + matching tone
3. Matching language + FRIENDLY tone
4. English + FRIENDLY tone

Create templates in multiple languages and tones for the best customer experience.

### Example Templates

**Greeting (English, Friendly):**
```
Hi {{customer_name}}! Welcome to {{business_name}}. How can I help you today?
```

**Order Tracking (Sinhala, Friendly):**
```
ආයුබෝවන් {{customer_name}}! ඔබගේ ඇණවුම {{order_id}} දැනට {{status}} තත්ත්වයේ පවතී.
```

**Refund Policy (English, Formal):**
```
Thank you for contacting {{business_name}}. Our return policy: {{returns_policy}}. If you need further assistance, a support agent will be with you shortly.
```

---

## Step 8: Enable AI-Powered Responses (Optional)

AI enhances the bot by handling messages that don't match standard keyword rules.

1. Go to **Settings > AI** tab
2. Toggle **"Enable AI-powered responses"** on
3. The bot will now:
   - Use AI to classify messages when keyword rules don't match
   - Generate contextual replies when no template matches the detected intent
   - Fall back to agent handoff when AI confidence is low

### How AI Works

```
Customer message arrives
        │
        ▼
8 keyword rules check first (fast, free)
        │
   Match found? ──Yes──→ Use template reply
        │
       No
        │
        ▼
AI classifies the intent (uses 1 AI call)
        │
        ▼
Template found for AI intent? ──Yes──→ Use template reply
        │
       No
        │
        ▼
AI generates a contextual response (uses 1 AI call)
```

### AI Usage Limits

Your plan includes a monthly AI call quota:

| Plan | AI Calls/Month |
|------|---------------|
| FREE | 50 |
| PRO | 1,000 |
| BUSINESS | 10,000 |

Monitor usage on the **AI** tab or the **Billing** page. The progress bar turns orange at 80% and red at 95%.

---

## Step 9: Add Your Support Team

Add agents and admins who will handle customer conversations.

1. Go to **Team** in the sidebar
2. Click **"+ Add Member"**
3. Fill in:
   - **Name** — Agent's full name
   - **Email** — Login email for the agent
   - **Password** — Minimum 8 characters
   - **Role:**
     - **Agent** — Can view inbox, reply to customers, and manage cases
     - **Admin** — Full access including settings, products, orders, and team management
4. Click **Create**

### Team Size Limits

| Plan | Max Team Members |
|------|-----------------|
| FREE | 1 (owner only) |
| PRO | 3 (owner + 2 agents) |
| BUSINESS | 10 (owner + 9 agents) |

If you hit the limit, upgrade your plan to add more members.

### Agent Login

Share the following with each new agent:
- **Dashboard URL:** `https://yourdomain.com`
- **Email:** The email you set during creation
- **Password:** The password you set

Agents can then log in and start handling conversations from the Inbox.

### Managing Team Members

- **Edit:** Change a member's name or role
- **Deactivate:** Prevent a member from logging in (without deleting their account)
- **Activate:** Restore access for a deactivated member

---

## Step 10: Go Live — Start Receiving Messages

Once everything is set up, your bot is live. Here's what happens when a customer messages your WhatsApp number:

### Automated Bot Flow

1. **Customer sends a message** (e.g., "Hello, what are your business hours?")
2. **Language detection** — The bot detects the message language (if auto-detect is enabled)
3. **Intent detection** — The bot identifies what the customer wants:
   - `greeting` — Hello, hi, good morning
   - `product_inquiry` — Questions about products, prices, availability
   - `order_tracking` — Where is my order, order status
   - `hours_location` — Business hours, location, address
   - `refund_cancel` — Refund requests, cancellations, returns
   - `complaint` — Complaints, dissatisfaction
   - `agent_request` — Talk to a human, speak to agent
   - `opt_out` — Stop messages, unsubscribe
4. **Template reply** — The bot sends the matching template in the right language and tone
5. **Agent handoff** — If the bot can't handle it, the conversation is flagged for a human agent

### When Agents Are Needed

The conversation appears in the **Inbox** with a "Needs Agent" badge when:
- The customer explicitly requests a human agent
- The bot can't determine the customer's intent
- The customer has a complex complaint or issue

### Testing the Bot

1. Open WhatsApp on your phone
2. Send a message to your connected business number
3. You should receive an automated reply
4. Check the **Inbox** in the dashboard — the conversation should appear
5. Try different messages:
   - "Hello" — Should get a greeting response
   - "What are your business hours?" — Should get hours info
   - "I want a refund" — Should get refund policy info
   - "Let me talk to a human" — Should escalate to agent

---

## Day-to-Day Operations

### Handling Customer Conversations (Inbox)

1. Go to **Inbox**
2. New conversations appear with a yellow **"Needs Agent"** badge
3. Click a conversation to view the chat history
4. Click **"Assign to Me"** to take ownership
5. Type your reply and press **Enter** or click **Send**
6. When the issue is resolved, click **"Close"**

### Managing Support Cases

Cases are created automatically for complex issues (complaints, refund requests):

1. Go to **Cases**
2. Filter by status, priority, or your assigned cases
3. Click a case to view details
4. Click **Edit** to update:
   - **Status:** Open → In Progress → Resolved → Closed
   - **Priority:** Low / Medium / High / Urgent
   - **Notes:** Add internal notes about the case
   - **Resolution:** Required when closing (describe how it was resolved)
5. Click **Save Changes**

### SLA Monitoring

Each case has an SLA deadline based on priority:
- **Green badge** — On track
- **Yellow badge** — Less than 2 hours remaining
- **Red badge** — SLA breached

---

## Managing Orders

### Creating an Order

1. Go to **Orders**
2. Click **"+ New Order"**
3. Fill in customer details and add items
4. Click **Create** — An order number is auto-generated (e.g., `ORD-2601-0001`)

### Order Lifecycle

```
Pending → Processing → Shipped → Delivered
                         ↓           ↓
                      Canceled    Refunded
```

### Shipping an Order

1. Open an order in **Pending** or **Processing** status
2. Fill in shipment details: Carrier, Tracking Number, Tracking URL
3. Click **"Mark Shipped"**
4. The customer can now ask the bot *"Where is my order?"* and get tracking info

### Customer Self-Service (WhatsApp)

Customers can check their order status via WhatsApp:
- *"Where is my order ORD-2601-0001?"* — Bot replies with status and tracking link
- *"What's my order status?"* — Bot looks up the customer's recent orders by phone number

---

## Monitoring Performance

### Analytics Dashboard

Go to **Analytics** to see:

| Metric | Description |
|--------|-------------|
| **Total Conversations** | Total + currently active conversations |
| **Total Cases** | Total + currently open cases |
| **Avg Response Time** | How quickly agents respond (in minutes) |
| **SLA Breaches** | Number of SLA deadline misses |

### Intent Distribution

See what customers are asking about most — a bar chart shows the top 8 intents (greeting, product inquiry, order tracking, etc.). Use this to optimize your templates and product catalog.

### Agent Performance

Track each agent's:
- Number of assigned conversations
- Number of resolved cases
- Average response time

### SLA Compliance

Per-priority breakdown showing:
- Total cases, resolved, breached
- SLA compliance percentage
- Color coding: Green (90%+), Yellow (70%+), Red (<70%)

---

## Upgrading Your Plan

### Available Plans

| Feature | FREE | PRO | BUSINESS |
|---------|------|-----|----------|
| **Price** | $0/month | Paid | Paid |
| **Team Members** | 1 | 3 | 10 |
| **Inbound Messages/month** | 500 | 5,000 | 50,000 |
| **AI Calls/month** | 50 | 1,000 | 10,000 |
| **Automation (n8n)** | No | Yes | Yes |
| **Analytics** | No | Yes | Yes |

### How to Upgrade *(Owner only)*

1. Go to **Billing** in the sidebar
2. Review the plan comparison cards
3. Click **"Upgrade to Pro"** or **"Upgrade to Business"**
4. Complete payment on the Stripe checkout page
5. Your plan is upgraded immediately upon successful payment

> **Note:** Only the account owner can upgrade plans or manage billing. Admins and agents can view usage but will see a "View-only access" banner instead of upgrade buttons. Contact your account owner to request changes.

### Managing Your Subscription *(Owner only)*

Click **"Manage Subscription"** on the Billing page to:
- Update your payment method
- View past invoices
- Cancel or change your plan

### Monitoring Usage

The Billing page shows this month's usage with progress bars:
- **Inbound Messages** — Messages received from customers
- **Outbound Messages** — Messages sent to customers
- **Automation Events** — n8n workflow triggers
- **AI Calls** — AI intent detection and response generation calls

Progress bars change color as limits approach:
- **Blue** — Normal usage
- **Orange** — 80%+ of limit
- **Red** — 95%+ of limit (consider upgrading)

---

## Plan Comparison

| Feature | FREE | PRO | BUSINESS |
|---------|------|-----|----------|
| WhatsApp Bot Auto-Replies | Yes | Yes | Yes |
| Live Agent Inbox | Yes | Yes | Yes |
| Product Catalog | Yes | Yes | Yes |
| Order Management | Yes | Yes | Yes |
| Case Management | Yes | Yes | Yes |
| Team Members | 1 | 3 | 10 |
| Inbound Messages | 500/mo | 5,000/mo | 50,000/mo |
| AI-Powered Responses | 50 calls/mo | 1,000 calls/mo | 10,000 calls/mo |
| n8n Automation | No | Yes | Yes |
| Analytics Dashboard | No | Yes | Yes |
| Multi-Language Support | Yes | Yes | Yes |
| Template Customization | Yes | Yes | Yes |
| CSV Product Import | Yes | Yes | Yes |
| Stripe Billing Portal | N/A | Yes | Yes |

---

## FAQ

### General

**Q: Can I use my existing WhatsApp Business number?**
A: Yes. You connect your own WhatsApp Business API number. The platform does not provide phone numbers — you bring your own.

**Q: Is my data shared with other businesses on the platform?**
A: No. Each business (tenant) is completely isolated. No other business can see your conversations, products, customers, or orders.

**Q: Can my customers tell they're talking to a bot?**
A: The bot replies with your customized templates in your chosen language and tone. Customers interact naturally — they message your WhatsApp number just like messaging any business. When the bot can't handle something, it seamlessly hands off to a human agent.

### WhatsApp

**Q: How do I get a WhatsApp Business API account?**
A: Go to [Meta Business Suite](https://business.facebook.com/), create a business account, then visit [Meta Developers](https://developers.facebook.com/) to create an app and add the WhatsApp product. Follow Meta's verification process.

**Q: Can I use my personal WhatsApp number?**
A: No. You need a WhatsApp Business API number from Meta. This is different from the regular WhatsApp or WhatsApp Business app.

**Q: What happens if the bot is down?**
A: Messages are queued in Redis and processed when the service recovers. No messages are lost. Meta also retries webhook delivery if the initial attempt fails.

### Billing

**Q: Can I try the platform for free?**
A: Yes. The FREE plan includes 1 team member, 500 inbound messages/month, and 50 AI calls/month — enough to get started and test the platform.

**Q: What happens when I hit my message limit?**
A: Inbound messages continue to be received but may not trigger automated responses. Upgrade your plan for higher limits.

**Q: Can I cancel anytime?**
A: Yes. Go to Billing > Manage Subscription to cancel via the Stripe portal. Your account remains active until the end of the current billing period.

### Team

**Q: What's the difference between Admin and Agent roles?**
A: **Agents** can view the inbox, reply to customers, and manage cases. **Admins** have full access including settings, products, orders, team management, and billing.

**Q: Can I remove a team member?**
A: You can deactivate a team member, which prevents them from logging in. They remain in the system and can be reactivated later.

### AI

**Q: Do I need AI enabled for the bot to work?**
A: No. The bot works with keyword-based rules and templates by default. AI is an optional enhancement that handles messages the keyword rules can't match.

**Q: Which AI providers are supported?**
A: The platform supports Anthropic (Claude), OpenAI (GPT), and Google (Gemini). The AI provider is configured by the platform administrator.

**Q: Does AI cost extra?**
A: AI calls are included in your plan quota (FREE: 50/mo, PRO: 1,000/mo, BUSINESS: 10,000/mo). No additional charges beyond your subscription.

### Technical

**Q: Can I access the API directly?**
A: Yes. The platform has a full REST API. Use your JWT token (from login) in the `Authorization: Bearer <token>` header. See the API documentation for all available endpoints.

**Q: Can I import my products from another system?**
A: Yes. Use the CSV import feature on the Products page. Prepare a CSV with the required columns and upload it. Products are matched by retailer ID for upsert.

**Q: How are my WhatsApp credentials stored?**
A: All sensitive credentials (access tokens, app secrets) are encrypted with AES-256-GCM before storage. They are never stored in plain text.
