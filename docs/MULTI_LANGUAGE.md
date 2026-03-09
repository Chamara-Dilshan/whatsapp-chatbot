# Multi-Language Support System

## Overview

The bot supports **3 languages** for customer interactions:

| Code | Language | Detection Method |
|------|----------|-----------------|
| EN | English | Default fallback |
| SI | Sinhala | Unicode range U+0D80–U+0DFF |
| TA | Tamil | Unicode range U+0B80–U+0BFF |

All language handling is **rules-based** — no LLM or AI calls involved.

---

## How It Works

The system has 3 layers: **Detection**, **Template Selection**, and **Rendering**.

### 1. Language Detection

**File:** `apps/api/src/services/language/language.service.ts`

When a customer sends a message, the language is resolved through a **4-step priority chain**:

| Priority | Method | Example |
|----------|--------|---------|
| 1 | **Keyword override** | Customer types "sinhala", "සිංහල", "tamil", "தமிழ்", or "english" |
| 2 | **Unicode auto-detection** | 3+ Sinhala or Tamil Unicode characters found in the message |
| 3 | **Conversation sticky** | Language saved from a previous message in the same conversation |
| 4 | **Tenant default** | `defaultLanguage` from tenant policies (Settings page) |

#### Keyword Overrides

If the customer explicitly mentions a language, it takes top priority:

- `"sinhala"` or `"සිංහල"` → SI
- `"tamil"` or `"தமிழ்"` → TA
- `"english"` → EN

#### Unicode Detection

Counts characters in specific Unicode ranges:

- **Sinhala:** U+0D80 to U+0DFF — if 3+ characters match → SI
- **Tamil:** U+0B80 to U+0BFF — if 3+ characters match → TA
- Otherwise → EN

#### Conversation Sticky

Once a language is detected for a conversation, it's saved to `Conversation.language` in the database. All future messages in that conversation default to the same language unless the customer switches.

#### Tenant Default

If none of the above methods detect a language, the system uses the tenant's `defaultLanguage` setting from policies (configurable in Settings > Language & Tone).

---

### 2. Template Selection (4-Step Fallback)

**File:** `apps/api/src/services/response/responseEngine.ts` → `findTemplate()`

After detecting the intent (e.g., GREETING, REFUND_CANCEL) and language, the system searches for a matching reply template using a **4-step fallback chain**:

| Step | Language | Tone | Description |
|------|----------|------|-------------|
| 1 | Detected (e.g. SI) | Tenant tone (e.g. FRIENDLY) | Best match — exact language + exact tone |
| 2 | EN | Tenant tone | Fallback to English with same tone |
| 3 | Detected (e.g. SI) | FRIENDLY | Fallback to detected language with default tone |
| 4 | EN | FRIENDLY | Ultimate fallback — English + Friendly |

If no template matches any step, it grabs **any active template** for that intent.

This ensures the bot **always has a reply**, even if templates for a specific language/tone combination haven't been created yet.

---

### 3. Template Rendering

**File:** `apps/api/src/services/template/templateRender.service.ts`

Templates use **Handlebars** syntax with 16 standard variables:

| Variable | Source | Example |
|----------|--------|---------|
| `{{customerName}}` | Customer record | "John" |
| `{{customerPhone}}` | Customer record | "+94771234567" |
| `{{businessName}}` | Tenant record | "Acme Store" |
| `{{businessPhone}}` | TenantWhatsApp | "+94112345678" |
| `{{productName}}` | Product context | "Wireless Earbuds" |
| `{{productPrice}}` | Product context | "2500.00" |
| `{{productCurrency}}` | Product context | "LKR" |
| `{{productDescription}}` | Product context | "Bluetooth 5.0 earbuds" |
| `{{orderNumber}}` | Order context | "ORD-2601-0001" |
| `{{orderStatus}}` | Order context | "shipped" |
| `{{trackingNumber}}` | Shipment context | "TRK123456" |
| `{{carrierName}}` | Shipment context | "DHL" |
| `{{returnPolicy}}` | Tenant policies | "30-day return policy" |
| `{{businessHours}}` | Tenant policies | "Mon-Fri 9AM-5PM" |
| `{{currentDate}}` | System | "2026-02-18" |
| `{{currentTime}}` | System | "14:30" |

Templates are **compiled once and cached** in memory for performance. Missing variables are silently replaced with empty strings.

---

## End-to-End Flow Example

**Customer sends:** `"මට refund එකක් ඕන"` (Sinhala: "I need a refund")

1. **Language Detection:**
   - Keyword check → no explicit keyword found
   - Unicode detection → finds Sinhala characters (U+0D80–U+0DFF) → **SI**
   - Language saved to `Conversation.language = 'SI'`

2. **Intent Detection:**
   - Rules engine matches "refund" keyword → intent = **REFUND_CANCEL**

3. **Template Selection:**
   - Step 1: Look for SI + FRIENDLY template for REFUND_CANCEL → **found!**
   - Returns the Sinhala refund template

4. **Template Rendering:**
   - Loads customer name, tenant policies, etc.
   - Renders: `"{{customerName}}, ඔබේ refund ඉල්ලීම ලැබුණා..."` → `"John, ඔබේ refund ඉල්ලීම ලැබුණා..."`

5. **Reply sent** in Sinhala via WhatsApp

**Next message from same customer:** `"order status?"` (English text, but conversation is sticky SI)

1. **Language Detection:**
   - No keyword, no Sinhala/Tamil Unicode → falls back to conversation sticky → **SI**
   - Reply still sent in Sinhala

**Customer types:** `"english"` → keyword override switches language to **EN** for all future messages.

---

## Seed Data

The seed creates **24 reply templates**:

- **12 intents** × **2 languages** (EN + SI) × **FRIENDLY tone**
- Tamil (TA) templates are **not seeded** — add them manually via Settings > Templates

### Seeded Intents

| Intent | EN Template | SI Template |
|--------|-------------|-------------|
| GREETING | Yes | Yes |
| PRODUCT_INQUIRY | Yes | Yes |
| ORDER_TRACKING | Yes | Yes |
| REFUND_CANCEL | Yes | Yes |
| COMPLAINT | Yes | Yes |
| HOURS_LOCATION | Yes | Yes |
| AGENT_REQUEST | Yes | Yes |
| OPT_OUT | Yes | Yes |
| THANK_YOU | Yes | Yes |
| FAREWELL | Yes | Yes |
| UNKNOWN | Yes | Yes |
| SPAM | Yes | Yes |

---

## Configuration

### Tenant Policies (Settings > Language & Tone)

| Setting | Description | Default |
|---------|-------------|---------|
| `defaultLanguage` | Fallback language when detection fails | EN |
| `tone` | Reply tone (FRIENDLY, PROFESSIONAL, CASUAL) | FRIENDLY |
| `autoDetectLanguage` | Enable/disable Unicode auto-detection | true |

### Adding New Language Templates

1. Go to **Settings > Templates** in the dashboard
2. Click **"+ Add Template"**
3. Select the intent, language (EN/SI/TA), and tone
4. Write the template body using `{{variables}}`
5. Save — the bot will immediately use it

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/services/language/language.service.ts` | Language detection (Unicode + keywords + sticky) |
| `apps/api/src/services/template/templateRender.service.ts` | Handlebars rendering with 16 variables |
| `apps/api/src/services/response/responseEngine.ts` | Template selection (4-step fallback) + response pipeline |
| `apps/api/src/services/intent/intentEngine.ts` | Intent detection (8 keyword rules) |
| `apps/dashboard/src/app/dashboard/settings/page.tsx` | Language & Tone settings UI |
