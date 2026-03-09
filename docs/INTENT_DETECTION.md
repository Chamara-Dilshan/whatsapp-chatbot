# Intent Detection System — How It Works

## Current System: Hybrid Rules + AI (Phase 6)

This project uses a **hybrid intent detection pipeline**: 8 keyword-matching rules run first (fast, free), and an **AI provider** (Anthropic Claude, OpenAI GPT, or Google Gemini) handles messages that rules can't classify.

---

## How It Works

```
Customer sends WhatsApp message: "Can you gift wrap my purchase?"
        ↓
   8 keyword-matching rules run in priority order:
   1. Opt-out / Opt-in check
   2. Agent request check ("speak to human", "talk to agent")
   3. Complaint check ("terrible", "worst", "unacceptable")
   4. Greeting check ("hi", "hello", "hey")
   5. Refund/Cancel check ("refund", "cancel", "return")
   6. Order tracking check ("where is my order", "track", "shipping")
   7. Business hours/location check ("what time", "where are you")
   8. Product inquiry check ("do you have", "price of", "looking for")
        ↓
   No rule matches with confidence >= 0.5
        ↓
   AI Provider (Anthropic Claude / OpenAI GPT / Google Gemini)
        ↓
   Returns: intent = "product_inquiry", confidence = 0.85
        ↓
   Response engine generates appropriate reply
   (template match → AI response fallback → generic fallback)
```

---

## The 8 Rules (Priority Order)

| Priority | Rule | Triggers On | Example Messages |
|---|---|---|---|
| 1 | Opt-out | stop, unsubscribe, opt out | "Stop messaging me" |
| 2 | Agent Request | speak to human, talk to agent | "I want to talk to a person" |
| 3 | Complaint | terrible, worst, unacceptable | "This is the worst service" |
| 4 | Greeting | hi, hello, hey, good morning | "Hello!" |
| 5 | Refund/Cancel | refund, cancel, return | "I want a refund" |
| 6 | Order Tracking | where is my order, track, shipping | "Where is my order?" |
| 7 | Hours/Location | what time, open, where are you | "What are your business hours?" |
| 8 | Product Inquiry | do you have, price, looking for | "Do you have blue shoes?" |

If **no rule matches** with enough confidence (threshold: 0.5), the message is sent to the AI provider.

---

## AI Provider Configuration

### Switching Providers

Set the `AI_PROVIDER` environment variable:

| Value | Provider | Default Model |
|---|---|---|
| `anthropic` | Anthropic Claude | `claude-3-5-haiku-20241022` |
| `openai` | OpenAI GPT | `gpt-4o-mini` |
| `gemini` | Google Gemini | `gemini-2.5-flash` |
| `none` | Stub (rules only) | N/A |

### Environment Variables

```env
AI_PROVIDER=anthropic          # or openai, gemini, none
ANTHROPIC_API_KEY=sk-ant-...   # Required if AI_PROVIDER=anthropic
OPENAI_API_KEY=sk-...          # Required if AI_PROVIDER=openai
GEMINI_API_KEY=AIza...         # Required if AI_PROVIDER=gemini
AI_MODEL=                      # Optional: override default model
AI_TIMEOUT_MS=5000             # Timeout per AI call (ms)
```

### Per-Tenant Toggle

Each tenant has an `aiEnabled` flag in their policies (`TenantPolicies.aiEnabled`). Even if the API key is configured, AI is only used for tenants that have explicitly enabled it in Settings > AI tab.

---

## Full Pipeline: Rules-First, AI Fallback

```
Customer message
        ↓
   ┌─────────────────────┐
   │  Rule matchers (1-8) │  ← Fast, free, no API calls
   └─────────┬───────────┘
             ↓
   Confidence >= 0.5?
   ├── YES → Return matched intent
   └── NO  ↓
   ┌─────────────────────┐
   │  Tenant AI enabled?  │  ← TenantPolicies.aiEnabled check
   └─────────┬───────────┘
   ├── NO  → Return "other" (default fallback)
   └── YES ↓
   ┌─────────────────────┐
   │  AI quota remaining? │  ← checkAiQuota(tenantId)
   └─────────┬───────────┘
   ├── NO  → Return "other" (quota exhausted)
   └── YES ↓
   ┌─────────────────────┐
   │  AI Provider         │  ← Anthropic / OpenAI / Gemini (with retry)
   └─────────┬───────────┘
             ↓
   Confidence >= 0.5?
   ├── YES → Return AI intent (increment aiCallsCount)
   └── NO  → Return "other" (default fallback)
```

### Response Generation Pipeline

After intent detection, the response engine follows this chain:

```
Intent detected
        ↓
   1. Template lookup (language + tone → EN + tone → language + FRIENDLY → EN + FRIENDLY)
   ├── Template found → Render with Handlebars → Send
   └── No template ↓
   2. AI Response Generation (if aiEnabled + quota available)
   ├── AI response generated (≤ 300 chars) → Send
   └── AI failed/disabled/exhausted ↓
   3. Generic fallback: "Thanks for your message! Type 'agent' to speak with a human."
```

---

## AI Quotas Per Plan

| Plan | AI Calls / Month | Cost |
|---|---|---|
| FREE | 50 | $0 |
| PRO | 1,000 | $49/mo |
| BUSINESS | 10,000 | $149/mo |

Usage is tracked atomically per tenant per calendar month in the `UsageCounter` table (`aiCallsCount` field). When the quota is exhausted, the system gracefully falls back to template-based replies.

---

## AI System Prompt

All three providers use the same system prompt for intent detection:

- Lists all 13 valid intents: `greeting`, `product_inquiry`, `order_status`, `refund_cancel`, `complaint`, `speak_to_human`, `hours_location`, `opt_out`, `opt_in`, `pricing`, `shipping`, `returns`, `other`
- Requests JSON-only output: `{"intent": "...", "confidence": 0.0-1.0, "extractedQuery": "..."}`
- Includes last 3-5 conversation messages for context
- Validates returned intent against the `INTENTS` enum (rejects hallucinated intents)
- Clamps confidence to [0, 1] range

For response generation, the system prompt includes:
- Business name, tone (friendly/formal/short), language (EN/SI/TA)
- Tenant policies (return policy, shipping policy, business hours)
- Instruction to not fabricate product or order information
- 300-character cap for WhatsApp UX

---

## Agent Handoff Triggers

Some intents automatically escalate to a human agent:

| Condition | Action |
|---|---|
| Intent = `speak_to_human` | Always hand off |
| Intent = `complaint` | Always hand off |
| Intent = `other` with confidence < 0.3 | Hand off (bot can't understand) |

---

## Graceful Degradation

The system is designed to never fail visibly to the customer:

| Failure Scenario | Behaviour |
|---|---|
| `AI_PROVIDER=none` | Rules only, stub AI returns "other" |
| API key missing | Warning logged, stub provider used |
| AI disabled for tenant | Rules only, skip AI fallback |
| AI quota exhausted | Rules only, skip AI fallback |
| AI API timeout (5s default) | Caught, falls back to template/generic reply |
| AI returns invalid intent | Rejected, falls back to "other" |
| AI response generation fails | Returns `null`, generic fallback used |

---

## Observability

### Prometheus Metrics

| Metric | Type | Labels |
|---|---|---|
| `ai_requests_total` | Counter | `provider`, `type` (intent/response), `status` (success/error) |
| `ai_request_duration_seconds` | Histogram | `provider`, `type` |
| `quota_exceeded_total` | Counter | `tenant_id`, `quota_type` (includes `ai`) |

### Logging

- Token usage (input/output tokens) logged per AI call
- Intent detection results logged with confidence and source (rule vs AI)
- AI errors logged with full context for debugging

---

## Key Files

| File | Purpose |
|---|---|
| `services/intent/intentEngine.ts` | Pipeline orchestrator (rules → AI toggle → quota → AI → fallback) |
| `services/intent/rules/*.ts` | 8 keyword rule matchers |
| `services/intent/aiProvider.interface.ts` | `AIIntentProvider` interface + `StubAIProvider` |
| `services/intent/providers/anthropicProvider.ts` | Anthropic Claude provider |
| `services/intent/providers/openaiProvider.ts` | OpenAI GPT provider |
| `services/intent/providers/geminiProvider.ts` | Google Gemini provider |
| `services/intent/providers/index.ts` | Provider factory (`createAIProvider()`) |
| `services/ai/aiResponse.service.ts` | AI response generation service |
| `services/response/responseEngine.ts` | Response engine (template → AI → generic fallback) |
| `services/billing/quota.service.ts` | `checkAiQuota()` enforcement |
| `services/billing/usage.service.ts` | `incrementUsage()` for `aiCallsCount` |
| `lib/metrics.ts` | Prometheus AI counters and histograms |

---

## Benefits of Hybrid Approach

- **No AI costs** for common messages (greetings, refunds, etc.) — rules handle ~70% of traffic
- **Faster responses** — no API round-trip for known patterns
- **AI only used** when rules fail — reduces cost significantly
- **Per-tenant control** — each tenant can enable/disable AI independently
- **Quota enforcement** — prevents runaway AI costs per plan tier
- **Graceful degradation** — system always responds, even if AI is unavailable
- **No API keys needed** for basic operation (`AI_PROVIDER=none`)
