# n8n: Order Delivered Feedback Workflow

This workflow sends a WhatsApp feedback request template message to a customer 2 days after their order is marked as delivered.

---

## Prerequisites

1. Your API is running and accessible from your n8n instance
2. `AUTOMATION_API_KEY` is configured in both the API `.env` and in n8n as a credential
3. A WhatsApp template named `delivery_feedback_request` has been approved in WhatsApp Business Manager
4. The order delivered event is fired when `POST /orders/:id/mark-delivered` is called

---

## Workflow Overview

```
[Webhook Trigger] → [Wait 2 days] → [Fetch Event Data] → [Send WhatsApp Template]
```

---

## Step-by-Step Setup

### 1. Create the Workflow in n8n

Open n8n, click **New Workflow**, and name it `Order Delivered — Feedback Request`.

---

### 2. Webhook Trigger Node

- **Node type:** Webhook
- **HTTP Method:** POST
- **Path:** `order-delivered` (n8n will generate the full URL)
- **Authentication:** None (API authenticates via key in request)
- **Response Mode:** Immediately

This endpoint is called by your API when an `order.delivered` automation event fires.

The API sends a POST to your `N8N_WEBHOOK_URL` with body:
```json
{
  "eventId": "clxyz123...",
  "eventType": "order.delivered",
  "tenantId": "...",
  "payload": {
    "orderId": "...",
    "orderNumber": "ORD-2601-0001",
    "customerPhone": "94771234567",
    "customerName": "John Silva",
    "total": "2500.00",
    "currency": "LKR"
  }
}
```

---

### 3. Wait Node

- **Node type:** Wait
- **Resume:** After time interval
- **Amount:** 2
- **Unit:** Days

This introduces the 2-day delay before sending the feedback request.

---

### 4. HTTP Request — Fetch Event Details (Optional)

If you need the full event details at send time (e.g., in case the payload changes):

- **Node type:** HTTP Request
- **Method:** GET
- **URL:** `{{ $env.API_URL }}/automation/events/{{ $json.eventId }}`
- **Authentication:** Header Auth
  - Name: `x-automation-key`
  - Value: `{{ $env.AUTOMATION_API_KEY }}`

---

### 5. HTTP Request — Send Template

- **Node type:** HTTP Request
- **Method:** POST
- **URL:** `{{ $env.API_URL }}/automation/actions/send-template`
- **Authentication:** Header Auth
  - Name: `x-automation-key`
  - Value: `{{ $env.AUTOMATION_API_KEY }}`
- **Body (JSON):**
```json
{
  "tenantId": "{{ $json.tenantId }}",
  "toWaId": "{{ $json.payload.customerPhone }}",
  "templateName": "delivery_feedback_request",
  "languageCode": "en",
  "parameters": [
    {
      "type": "text",
      "text": "{{ $json.payload.customerName }}"
    },
    {
      "type": "text",
      "text": "{{ $json.payload.orderNumber }}"
    }
  ]
}
```

---

### 6. Mark Event as Delivered

After the template is sent, mark the automation event as delivered:

- **Node type:** HTTP Request
- **Method:** POST
- **URL:** `{{ $env.API_URL }}/automation/events/{{ $json.eventId }}/delivered`
- **Authentication:** Same header auth as above
- **Body:** `{}`

---

### 7. Error Handling — Mark Event as Failed

Add an **Error Trigger** node that runs if any HTTP Request node fails:

- **Node type:** HTTP Request
- **Method:** POST
- **URL:** `{{ $env.API_URL }}/automation/events/{{ $json.eventId }}/failed`
- **Authentication:** Same header auth
- **Body:**
```json
{
  "error": "{{ $json.message }}"
}
```

---

## n8n Environment Variables

Set these in n8n under **Settings → Variables**:

| Variable | Value |
|----------|-------|
| `API_URL` | `http://your-api-host:4000` (or `https://api.yourdomain.com`) |
| `AUTOMATION_API_KEY` | Same value as `AUTOMATION_API_KEY` in your API `.env` |

---

## WhatsApp Template Setup

In **WhatsApp Business Manager → Message Templates**, create a template:

- **Name:** `delivery_feedback_request`
- **Category:** UTILITY
- **Language:** English (or your target language)
- **Body:**
  ```
  Hi {{1}}, your order {{2}} has been delivered! 🎉

  We'd love to hear your feedback. How was your experience?

  Reply with a number:
  1️⃣ Excellent
  2️⃣ Good
  3️⃣ Could be better
  ```

Wait for template approval before activating the workflow.

---

## Testing

1. Create a test order via `POST /orders`
2. Call `POST /orders/:id/mark-delivered`
3. Check n8n execution log — the webhook trigger should fire immediately
4. The wait node will pause for 2 days in production (set to 2 minutes for testing)
5. After the wait, the template should be sent to the customer's WhatsApp

---

## Related Workflows

See [N8N_WORKFLOWS.md](N8N_WORKFLOWS.md) for the other three standard workflows:
- New conversation alert (Slack)
- SLA breach alert (email)
- Daily analytics digest
