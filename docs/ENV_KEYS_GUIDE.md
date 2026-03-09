# Environment Keys Guide — WhatsApp, n8n & Phase 5 Integration

## Core Keys (Required for All Environments)

---

## 1. `WEBHOOK_VERIFY_TOKEN`

**What:** A password you create to verify your WhatsApp webhook connection with Meta.

**How it works:**
- When you set up the webhook in **Meta Business Manager**, Meta sends a GET request to your API with this token
- Your API checks: "Does the token Meta sent match mine?" If yes, the webhook is verified
- It's a **one-time handshake** — you set the same value in both Meta and your `.env`

**You choose it** — it can be any string you want (e.g., `my-secret-token-123`)

---

## 2. `N8N_WEBHOOK_URL`

**What:** The URL where your **n8n instance** listens for events from your API.

**How it works:**
- When something happens (e.g., customer requests an agent, a complaint comes in, an order is delivered), your API sends an event to this URL
- n8n receives it and runs an automation workflow
- `localhost:5678` is n8n's default port

**You change this** to your actual n8n URL when deployed (e.g., `https://your-n8n.example.com/webhook/whatsapp-events`)

---

## 3. `AUTOMATION_API_KEY`

**What:** A secret key that n8n uses to **call back** into your API.

**How it works:**
- When n8n wants to send data back to your API or trigger actions (e.g., `POST /automation/actions/send-template`), it includes this key in the header: `X-Automation-Key: <your-key>`
- Your API checks: "Does this key match?" If yes, the request is allowed
- Protects all `/automation/*` endpoints from unauthorized access

**You choose it** — change it to something strong in production

---

## Phase 5 Keys (Required for Production / Advanced Features)

---

## 4. `REDIS_URL`

**What:** Connection string for your Redis instance.

**How it works:**
- Used by BullMQ for webhook job queuing (inbound messages are enqueued and processed asynchronously)
- Used by the cache service (policies, templates, product categories cached in Redis)
- Format: `redis://[:password@]host:port[/db]`

**Example:** `redis://localhost:6379` (local) or `redis://:strongpassword@redis:6379/0` (Docker)

**Required for:** Webhook queue processing. Without Redis, the API won't start if `REDIS_URL` is set and unreachable.

---

## 5. `JWT_REFRESH_SECRET`

**What:** A separate signing secret for long-lived refresh tokens (7 days).

**How it works:**
- Access tokens (`JWT_SECRET`) expire after 15 minutes
- When an access token expires, the dashboard uses the refresh token to call `POST /auth/refresh` and get a new one
- Using a different secret for refresh tokens means you can independently invalidate all refresh tokens without affecting access tokens

**You choose it** — must be at least 32 characters, different from `JWT_SECRET`

---

## 6. `STRIPE_SECRET_KEY`

**What:** Your Stripe API secret key for billing operations.

**How it works:**
- Used server-side to create checkout sessions, manage subscriptions, and process webhooks
- **Never expose this key in client-side code**
- Use `sk_test_...` for development, `sk_live_...` for production

**Where to get it:** Stripe Dashboard → Developers → API Keys

---

## 7. `STRIPE_WEBHOOK_SECRET`

**What:** Signing secret for verifying Stripe webhook payloads.

**How it works:**
- When Stripe sends events (subscription created, payment failed, etc.) to `POST /billing/stripe-webhook`, it signs the payload
- Your API uses this secret to verify the payload hasn't been tampered with
- Format: `whsec_...`

**Where to get it:** Stripe Dashboard → Developers → Webhooks → select your endpoint → Signing secret

**Events to subscribe to:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 8. `STRIPE_PRICE_ID_PRO`

**What:** The Stripe Price ID for your PRO plan recurring subscription.

**How it works:**
- When a tenant clicks "Upgrade to Pro", the API creates a Stripe Checkout Session using this Price ID
- Format: `price_...`

**Where to get it:** Stripe Dashboard → Products → create a "Pro Plan" product → add a recurring price → copy the Price ID

---

## 9. `STRIPE_PRICE_ID_BUSINESS`

**What:** The Stripe Price ID for your BUSINESS plan recurring subscription.

Same as above but for the Business tier.

---

## 10. `DASHBOARD_URL`

**What:** The public URL of your dashboard (used for Stripe redirect URLs after checkout/portal).

**How it works:**
- After Stripe checkout completes, customers are redirected to `DASHBOARD_URL/dashboard/billing`
- After Stripe portal session, customers are redirected back here

**Example:** `https://app.yourdomain.com` (production) or `http://localhost:3001` (development)

---

## AI Provider Keys (Phase 6)

---

## 11. `AI_PROVIDER`

**What:** Selects which AI provider to use for intent detection and response generation.

**Values:**
- `anthropic` — Uses Anthropic Claude (default model: `claude-3-5-haiku-20241022`)
- `openai` — Uses OpenAI GPT (default model: `gpt-4o-mini`)
- `gemini` — Uses Google Gemini (default model: `gemini-2.5-flash`)
- `none` — Disables AI entirely (rules-only mode, no API keys needed)

**Default:** `none`

---

## 12. `ANTHROPIC_API_KEY`

**What:** Your Anthropic API key for Claude AI.

**How it works:**
- Used when `AI_PROVIDER=anthropic` for intent detection and response generation
- Messages that don't match keyword rules are sent to Claude for classification
- AI also generates contextual replies when no template matches

**Where to get it:** [console.anthropic.com](https://console.anthropic.com/) → API Keys

**Required only if** `AI_PROVIDER=anthropic`

---

## 13. `OPENAI_API_KEY`

**What:** Your OpenAI API key for GPT models.

**How it works:**
- Same as Anthropic but uses OpenAI's API
- Uses JSON mode (`response_format: { type: "json_object" }`) for reliable structured output

**Where to get it:** [platform.openai.com](https://platform.openai.com/) → API Keys

**Required only if** `AI_PROVIDER=openai`

---

## 14. `GEMINI_API_KEY`

**What:** Your Google Gemini API key.

**How it works:**
- Same as Anthropic/OpenAI but uses Google's Generative AI API
- Uses the chat API (`startChat()` + `sendMessage()`) with `systemInstruction` for structured output
- JSON is extracted from the response text (handles markdown code blocks automatically)

**Where to get it:** [aistudio.google.com](https://aistudio.google.com/) → Get API Key

**Required only if** `AI_PROVIDER=gemini`

---

## 15. `AI_MODEL` (Optional)

**What:** Override the default AI model.

**Default models:**
- Anthropic: `claude-3-5-haiku-20241022`
- OpenAI: `gpt-4o-mini`
- Gemini: `gemini-2.5-flash`

**When to change:** If you want to use a different model (e.g., `claude-3-5-sonnet-20241022` for higher quality, `gpt-4o` for more capability, or `gemini-2.0-flash` for Gemini).

---

## 16. `AI_TIMEOUT_MS` (Optional)

**What:** Maximum time in milliseconds to wait for an AI API response.

**Default:** `5000` (5 seconds)

**How it works:**
- If the AI provider doesn't respond within this time, the request is aborted
- The system gracefully falls back to template-based or generic replies
- Prevents slow AI responses from blocking the webhook pipeline

---

---

## 17. `RESEND_API_KEY` (Optional)

**What:** Your [Resend](https://resend.com) API key for sending transactional emails.

**How it works:**
- Used exclusively for the **forgot password** flow — sends an email containing a one-time reset link
- If not set, the reset link is printed to the API server console instead (useful for local development)
- The reset link expires in **1 hour** and is one-time use

**Where to get it:** [resend.com](https://resend.com) → Create account → API Keys → Create API Key

**Required only if** you want actual password reset emails to be sent to users.

---

## 18. `EMAIL_FROM`

**What:** The sender email address shown in password reset emails.

**Default:** `noreply@example.com`

**How it works:**
- Must be a verified domain/email in your Resend account
- Example: `noreply@yourdomain.com`

**Note:** In Resend's free tier you can send from `onboarding@resend.dev` for testing without domain verification.

---

## The Full Flow

```
Customer → WhatsApp Message
                ↓
        Your API (port 4000)
                ↓ enqueues job
          Redis / BullMQ
                ↓ processes
       Webhook Pipeline (14 steps)
                ↓ if automation event
        n8n (N8N_WEBHOOK_URL)
                ↓ calls back
        Your API (/automation/actions/send-template)
                  ← validates with AUTOMATION_API_KEY
```

### Billing Flow

```
Tenant clicks "Upgrade"
        ↓
POST /billing/create-checkout-session
        ↓
Stripe Checkout (hosted page)
        ↓ payment success
POST /billing/stripe-webhook ← verified with STRIPE_WEBHOOK_SECRET
        ↓
TenantSubscription updated in DB
        ↓
Redirect → DASHBOARD_URL/dashboard/billing
```

### Connection Summary

| Key | Secures Connection | Direction |
|---|---|---|
| `WEBHOOK_VERIFY_TOKEN` | Meta ↔ Your API | Meta verifies your webhook endpoint |
| `N8N_WEBHOOK_URL` | Your API → n8n | Your API sends events to n8n |
| `AUTOMATION_API_KEY` | n8n → Your API | n8n calls back into your API securely |
| `REDIS_URL` | API ↔ Redis | Webhook queue + cache |
| `JWT_SECRET` | Dashboard ↔ API | Short-lived access tokens (15 min) |
| `JWT_REFRESH_SECRET` | Dashboard ↔ API | Long-lived refresh tokens (7 days) |
| `STRIPE_SECRET_KEY` | API ↔ Stripe | Billing operations |
| `STRIPE_WEBHOOK_SECRET` | Stripe → API | Webhook payload verification |
| `STRIPE_PRICE_ID_PRO` | API → Stripe | PRO plan checkout |
| `STRIPE_PRICE_ID_BUSINESS` | API → Stripe | BUSINESS plan checkout |
| `DASHBOARD_URL` | Stripe → Dashboard | Post-checkout redirect |
| `AI_PROVIDER` | API → AI Provider | Selects Anthropic / OpenAI / Gemini / none |
| `ANTHROPIC_API_KEY` | API → Anthropic | Claude AI intent + response calls |
| `OPENAI_API_KEY` | API → OpenAI | GPT intent + response calls |
| `GEMINI_API_KEY` | API → Google | Gemini AI intent + response calls |
| `AI_MODEL` | API → AI Provider | Override default model (optional) |
| `AI_TIMEOUT_MS` | API → AI Provider | Max wait time per AI call (optional) |
| `RESEND_API_KEY` | API → Resend | Password reset email delivery (optional) |
| `EMAIL_FROM` | API → Resend | Sender address for reset emails (optional) |
