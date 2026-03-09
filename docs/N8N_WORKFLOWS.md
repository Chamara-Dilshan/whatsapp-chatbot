# n8n Automation Workflows

This document describes the n8n integration with the WhatsApp Business Support Bot and provides workflow templates for common automation scenarios.

## Overview

The WhatsApp Bot integrates with n8n to enable advanced automation workflows. When specific events occur (case created, high priority alerts, SLA breaches), the bot dispatches automation events that n8n can process to trigger notifications, create tickets in external systems, send alerts to Slack/Teams, etc.

## Setup

### 1. n8n Installation

Install n8n locally or use n8n cloud:

```bash
npm install -g n8n
n8n start
```

n8n will be available at `http://localhost:5678`

### 2. Configure Environment Variables

In your `.env` file, configure:

```env
# n8n webhook URL (where events will be sent)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/whatsapp-bot-events

# API key for securing n8n communication
AUTOMATION_API_KEY=your-secure-api-key-here
```

### 3. How It Works

1. **Event Triggers**: When certain events occur in the bot (case created, high priority case, SLA breach), an `AutomationEvent` is created in the database with status `pending`.

2. **Dispatcher**: The automation dispatcher runs every 30 seconds, polling for pending events and sending them to the n8n webhook.

3. **n8n Workflows**: n8n receives the events and processes them according to your configured workflows.

4. **Acknowledgment**: n8n can acknowledge events by calling the bot's automation endpoints.

## Event Types

The bot dispatches the following event types:

**Case & Support Events:**
- `case_created` - A new case has been created
- `case_assigned` - A case has been assigned to an agent
- `case_resolved` - A case has been resolved
- `high_priority_case` - A high-priority or urgent case needs attention
- `sla_breach` - An SLA deadline has been breached

**Order Events:**
- `order.shipped` - An order has been marked as shipped (includes `orderNumber`, `customerPhone`, `trackingNumber`)
- `order.delivered` - An order has been marked as delivered (includes `orderNumber`, `customerPhone`, `deliveredAt`)

> **Note:** Order events are only dispatched if the tenant's plan includes automation (`PRO` or `BUSINESS`). Free plan tenants will not receive these events.

## Workflow 1: Case Created Notification

**Purpose**: Send a Slack notification when a new case is created.

### Workflow Setup

1. **Webhook Trigger**
   - Method: POST
   - Path: `/webhook/whatsapp-bot-events`
   - Authentication: Header Auth with `X-Automation-API-Key`

2. **Filter Node** (optional)
   - Filter for `eventType === 'case_created'`

3. **Slack Node**
   - Action: Send Message
   - Channel: `#support-alerts`
   - Message:
     ```
     🆕 New Support Case Created

     Case ID: {{ $json.payload.caseId }}
     Priority: {{ $json.payload.priority }}
     Customer: {{ $json.payload.customerWaId }}
     Intent: {{ $json.payload.intent }}

     View in Dashboard: https://dashboard.example.com/cases/{{ $json.payload.caseId }}
     ```

4. **HTTP Request Node** (acknowledge event)
   - Method: POST
   - URL: `http://localhost:4000/automation/events/{{ $json.eventId }}/delivered`
   - Headers:
     - `X-Automation-API-Key`: `your-secure-api-key-here`
     - `Content-Type`: `application/json`

### Example Workflow JSON

```json
{
  "name": "Case Created Notification",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "whatsapp-bot-events",
        "httpMethod": "POST",
        "authentication": "headerAuth",
        "options": {}
      }
    },
    {
      "name": "Filter Case Created",
      "type": "n8n-nodes-base.if",
      "position": [450, 300],
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.eventType }}",
              "value2": "case_created"
            }
          ]
        }
      }
    },
    {
      "name": "Slack Notification",
      "type": "n8n-nodes-base.slack",
      "position": [650, 200],
      "parameters": {
        "channel": "#support-alerts",
        "text": "=🆕 New Support Case\\n\\nCase ID: {{ $json.payload.caseId }}\\nPriority: {{ $json.payload.priority }}\\nCustomer: {{ $json.payload.customerWaId }}"
      }
    },
    {
      "name": "Acknowledge Event",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 200],
      "parameters": {
        "method": "POST",
        "url": "=http://localhost:4000/automation/events/{{ $json.eventId }}/delivered",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "options": {}
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Filter Case Created", "type": "main", "index": 0 }]]
    },
    "Filter Case Created": {
      "main": [[{ "node": "Slack Notification", "type": "main", "index": 0 }]]
    },
    "Slack Notification": {
      "main": [[{ "node": "Acknowledge Event", "type": "main", "index": 0 }]]
    }
  }
}
```

## Workflow 2: High Priority Case Alert

**Purpose**: Send urgent alerts to Slack and email when a high-priority case is created.

### Workflow Setup

1. **Webhook Trigger** (same as Workflow 1)

2. **Filter Node**
   - Filter for `eventType === 'high_priority_case'`

3. **Slack Node**
   - Channel: `#urgent-support`
   - Message:
     ```
     🚨 URGENT: High Priority Case

     Case ID: {{ $json.payload.caseId }}
     Priority: {{ $json.payload.priority }}
     Reason: {{ $json.payload.reason }}

     IMMEDIATE ACTION REQUIRED
     View: https://dashboard.example.com/cases/{{ $json.payload.caseId }}
     ```

4. **Email Node** (optional)
   - To: Support manager email
   - Subject: `URGENT: High Priority Case #{{ $json.payload.caseId }}`
   - Body: Similar to Slack message

5. **HTTP Request Node** (acknowledge event)

### Key Features

- Uses urgent channel `#urgent-support`
- Sends to multiple notification channels (Slack + Email)
- Immediate visibility for critical issues

## Workflow 3: SLA Breach Alert

**Purpose**: Monitor SLA compliance and alert when cases breach their SLA deadlines.

### Workflow Setup

This workflow requires two parts:

#### Part A: Scheduled SLA Monitor

1. **Cron Node** (runs every 15 minutes)
   - Expression: `*/15 * * * *`

2. **HTTP Request Node** (get SLA metrics)
   - Method: GET
   - URL: `http://localhost:4000/analytics/sla`
   - Headers:
     - `Authorization`: `Bearer {{ $credentials.apiToken }}`

3. **Function Node** (detect breaches)
   - Code:
     ```javascript
     const metrics = $input.all();
     const breaches = [];

     for (const metric of metrics) {
       if (metric.json.breached > 0) {
         breaches.push({
           priority: metric.json.priority,
           breached: metric.json.breached,
           slaCompliance: metric.json.slaCompliance
         });
       }
     }

     return breaches.length > 0 ? breaches.map(b => ({ json: b })) : [];
     ```

4. **Slack Node** (if breaches detected)
   - Channel: `#sla-alerts`
   - Message:
     ```
     ⚠️ SLA Breach Alert

     Priority: {{ $json.priority }}
     Breached Cases: {{ $json.breached }}
     SLA Compliance: {{ $json.slaCompliance }}%

     Action Required: Review and resolve cases
     ```

#### Part B: Real-time SLA Breach Event

1. **Webhook Trigger** (receives `sla_breach` events)

2. **Filter Node**
   - Filter for `eventType === 'sla_breach'`

3. **Slack Node**
   - Channel: `#sla-alerts`
   - Message:
     ```
     🔴 SLA Deadline Breached

     Case ID: {{ $json.payload.caseId }}
     Priority: {{ $json.payload.priority }}
     Breach Time: {{ $json.payload.breachTime }}

     Immediate resolution required
     ```

4. **HTTP Request Node** (acknowledge event)

### Key Features

- Dual approach: scheduled monitoring + real-time events
- Proactive SLA compliance tracking
- Immediate alerts on breaches

## Advanced Workflows

### Workflow 4: Create Jira Ticket on Case Creation

Automatically create a Jira ticket when a high-priority case is created:

1. Webhook receives `case_created` event
2. Filter for high priority cases
3. Jira node creates ticket with case details
4. HTTP request updates case with Jira ticket ID
5. Acknowledge event

### Workflow 5: Auto-assign Cases Based on Agent Load

1. Webhook receives `case_created` event
2. HTTP request to get agent analytics (workload)
3. Function node to find agent with lowest load
4. HTTP request to assign case to that agent
5. Slack notification to assigned agent
6. Acknowledge event

### Workflow 6: Customer Sentiment Analysis

1. Webhook receives `case_created` event
2. HTTP request to get conversation messages
3. AI node (OpenAI) analyzes sentiment
4. If negative sentiment detected:
   - Escalate priority
   - Send alert to manager
   - Update case notes with sentiment score
5. Acknowledge event

## API Endpoints for n8n

### Acknowledge Event Delivery

```
POST /automation/events/:eventId/delivered
Headers:
  X-Automation-API-Key: your-api-key
```

### Mark Event as Failed

```
POST /automation/events/:eventId/failed
Headers:
  X-Automation-API-Key: your-api-key
Body:
  { "error": "Error message" }
```

### Get Event Details

```
GET /automation/events/:eventId
Headers:
  X-Automation-API-Key: your-api-key
```

### Post Results Back to Bot

```
POST /automation/webhook/n8n
Headers:
  X-Automation-API-Key: your-api-key
Body:
  {
    "action": "notification_sent",
    "payload": { ... }
  }
```

### Send WhatsApp Template Message *(New in Phase 5)*

Use this endpoint to send a pre-approved WhatsApp template message to a customer. Ideal for post-delivery confirmations, feedback requests, and re-engagement messages where the 24-hour messaging window has expired.

```
POST /automation/actions/send-template
Headers:
  X-Automation-API-Key: your-api-key
  Content-Type: application/json
Body:
  {
    "tenantId": "tenant_id_here",
    "toWaId": "94771234567",
    "templateName": "delivery_feedback_request",
    "languageCode": "en",
    "parameters": [
      { "type": "text", "text": "John Silva" },
      { "type": "text", "text": "ORD-2601-0001" }
    ]
  }
Response:
  { "success": true, "waMessageId": "wamid.xxx" }
```

See `docs/N8N_ORDER_DELIVERED_WORKFLOW.md` for a complete worked example using this endpoint.

## Event Payload Examples

### Case Created Event

```json
{
  "eventId": "evt_abc123",
  "eventType": "case_created",
  "tenantId": "tenant_xyz",
  "payload": {
    "caseId": "case_123",
    "conversationId": "conv_456",
    "priority": "high",
    "customerId": "cust_789",
    "customerWaId": "1234567890",
    "intent": "complaint"
  },
  "timestamp": "2026-02-16T10:30:00Z"
}
```

### High Priority Case Event

```json
{
  "eventId": "evt_def456",
  "eventType": "high_priority_case",
  "tenantId": "tenant_xyz",
  "payload": {
    "caseId": "case_124",
    "conversationId": "conv_457",
    "priority": "urgent",
    "reason": "Complaint detected"
  },
  "timestamp": "2026-02-16T10:35:00Z"
}
```

### Order Shipped Event

```json
{
  "eventId": "evt_ghi789",
  "eventType": "order.shipped",
  "tenantId": "tenant_xyz",
  "payload": {
    "orderId": "ord_abc123",
    "orderNumber": "ORD-2601-0001",
    "customerPhone": "94771234567",
    "trackingNumber": "1Z999AA10123456784"
  },
  "timestamp": "2026-02-18T08:00:00Z"
}
```

### Order Delivered Event

```json
{
  "eventId": "evt_jkl012",
  "eventType": "order.delivered",
  "tenantId": "tenant_xyz",
  "payload": {
    "orderId": "ord_abc123",
    "orderNumber": "ORD-2601-0001",
    "customerPhone": "94771234567",
    "deliveredAt": "2026-02-18T10:30:00Z"
  },
  "timestamp": "2026-02-18T10:30:00Z"
}
```

---

## Best Practices

1. **Always Acknowledge Events**: Ensure workflows acknowledge events to prevent duplicate processing.

2. **Error Handling**: Use n8n's error handling nodes to catch failures and mark events as failed.

3. **Rate Limiting**: Be mindful of API rate limits when making multiple requests.

4. **Secure API Keys**: Store API keys in n8n credentials, never hardcode them.

5. **Testing**: Test workflows with sample events before deploying to production.

6. **Monitoring**: Set up logging and monitoring for n8n workflows to catch issues early.

7. **Idempotency**: Design workflows to be idempotent in case events are retried.

## Troubleshooting

### Events Not Reaching n8n

1. Check that `N8N_WEBHOOK_URL` is correctly configured
2. Verify n8n webhook is active (test mode off)
3. Check API key matches in both systems
4. Review bot logs for dispatcher errors

### Events Failing

1. Check n8n workflow execution logs
2. Verify all nodes are properly configured
3. Test individual nodes with sample data
4. Check network connectivity between systems

### Duplicate Events

1. Ensure workflows acknowledge events
2. Check for multiple webhook triggers
3. Review event status in database (should be 'delivered', not 'pending')

## Monitoring

Query pending/failed events:

```sql
SELECT * FROM "AutomationEvent"
WHERE status IN ('pending', 'failed')
ORDER BY "createdAt" DESC
LIMIT 100;
```

Check event statistics:

```sql
SELECT status, COUNT(*)
FROM "AutomationEvent"
GROUP BY status;
```

## Support

For issues with n8n integration:
1. Check n8n documentation: https://docs.n8n.io
2. Review bot automation service logs
3. Test endpoints with curl/Postman
4. Verify webhook connectivity and authentication
