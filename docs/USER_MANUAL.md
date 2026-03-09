# WhatsApp Business Support Bot — Dashboard User Manual

## 1. Getting Started

### Register (New Business Owner)
- Navigate to `http://localhost:3001/register`
- Fill in: **Business Name**, **Your Name**, **Email**, **Password** (min 8 characters)
- Click **Create Account**
- You will be automatically logged in and redirected to the dashboard
- Your account is created as the **Owner** of a new tenant

### Login (Existing Users)
- Navigate to `http://localhost:3001/login`
- Enter your **Email** and **Password**
- Click **Sign In**
- Don't have an account? Click **"Sign up"** to go to the registration page
- Forgot your password? Click **"Forgot password?"** (see below)
- Demo credentials: `owner@acme.test` / `password123` (owner) or `agent@acme.test` / `password123` (agent)

### Forgot Password
- Click **"Forgot password?"** on the login page, or navigate to `http://localhost:3001/forgot-password`
- Enter your **Email** and click **"Send reset link"**
- You will always see a "Check your email" confirmation — even if the email isn't registered (prevents account enumeration)
- Click the link in the email → you will be taken to the **Reset Password** page
- Enter and confirm your **New Password** (minimum 8 characters)
- On success you are automatically redirected to the login page
- Reset links expire after **1 hour** and can only be used once

### Navigation
The sidebar (left side) provides access to all sections:
- **Inbox** — Customer conversations
- **Cases** — Support case management
- **Products** — Product catalog
- **Orders** — Order management and shipment tracking
- **Analytics** — Business metrics
- **Billing** — Subscription plans and usage
- **Team** — Team member management *(Owner/Admin only)*
- **Settings** — Configuration

On **mobile**, tap the hamburger menu (top-left) to open the sidebar. Your profile and **Sign Out** button are at the bottom of the sidebar.

---

## 2. Inbox

Manage live WhatsApp conversations with customers.

### Conversation List (Left Panel)
- Shows all conversations needing attention
- Each card displays: **customer name**, **status badge** (yellow "Needs Agent" / green "In Progress"), and a **message preview**
- Stats at the top show: Total, Unassigned, and My Assigned counts

### Chat View (Right Panel)
- Click a conversation to open the chat
- **Inbound messages** (customer): left-aligned, white background
- **Outbound messages** (agent): right-aligned, blue background
- Each message shows a timestamp

### Actions
| Action | How |
|---|---|
| Claim a conversation | Click **"Assign to Me"** button in the chat header |
| Reply to customer | Type in the text box at the bottom, press **Enter** or click **Send** |
| Close conversation | Click **"Close"** button in the chat header |

> **Mobile:** Use the toggle to switch between the conversation list and chat view.

---

## 3. Cases

Track and manage support cases with SLA monitoring.

### Dashboard Stats
Five cards at the top: **Total**, **Open** (blue), **In Progress** (yellow), **Resolved** (green), **SLA Breached** (red).

### Filtering
- **Status:** All / Open / In Progress / Resolved / Closed
- **Priority:** All / Low / Medium / High / Urgent
- **My Cases Only:** Checkbox to show only cases assigned to you
- **Clear Filters:** Resets all filters

### Viewing a Case
Click any case row to open the **detail modal**, which shows:
- Subject, Status, Priority, Assigned To
- Tags, Notes, Resolution
- Timestamps: Created, First Response, Resolved, SLA Deadline

### Editing a Case
1. Open a case, click **Edit**
2. Modify: Subject, Status, Priority, Tags, Notes, Resolution
3. Click **Save Changes**
4. **Note:** Resolution is required when closing a case

### Quick Actions (in table)
- **Assign to Me** — claim the case
- **Close** — close the case directly

### SLA Indicators
- **Green:** On track
- **Yellow:** Less than 2 hours remaining
- **Red:** SLA breached

---

## 4. Products

Manage your product catalog for WhatsApp commerce.

### Search & Filter
- **Search box** — real-time search (300ms debounce)
- **Category dropdown** — filter by product category
- **Stock Status** — All / In Stock / Out of Stock

### Add a Product *(Admin/Owner only)*
1. Click **"+ Add Product"**
2. Fill in: Retailer ID, Name, Description, Price, Currency, Image URL, Category, Keywords, In Stock
3. Click **Save**

### Edit / Delete *(Admin/Owner only)*
- Click the **pencil icon** to edit, or **trash icon** to delete
- Delete is a soft-delete (product becomes inactive)

### CSV Import *(Admin/Owner only)*
1. Click **"Import CSV"**
2. Select a `.csv` file with columns: `retailerId, name, description, price, currency, imageUrl, category, keywords, inStock`
3. Click **Import**
4. Review the results: success count, skipped count, and any row-level errors

### Pagination
- 20 products per page
- Use **Previous / Next** buttons to navigate

---

## 5. Orders

Manage customer orders and shipment tracking.

### Orders List
- Shows all orders for your tenant with status badges, order numbers, customer info, and totals
- **Filter by status:** All / Pending / Processing / Shipped / Delivered / Canceled / Refunded
- **Search:** by order number or customer phone
- **Pagination:** 20 orders per page

### Order Statuses
| Status | Meaning |
|---|---|
| Pending | Order placed, awaiting processing |
| Processing | Being prepared for shipment |
| Shipped | Dispatched — tracking available |
| Delivered | Confirmed received by customer |
| Canceled | Order canceled |
| Refunded | Refund issued |

### Creating an Order *(Admin/Owner only)*
Click **"+ New Order"** and fill in:
- Customer phone (required), customer name (optional)
- Items: product title, quantity, unit price
- Shipping fee, currency, notes
- Order number is auto-generated (e.g., `ORD-2601-0001`)

### Updating an Order

**Mark Shipped:**
1. Open an order in Pending or Processing status
2. Fill in shipment details: **Carrier**, **Tracking Number**, **Tracking URL** (all optional)
3. Click **"Mark Shipped"** — status changes to `shipped`, a shipment record is created, and an `order.shipped` automation event fires for n8n

**Mark Delivered:**
- Click **"Mark Delivered"** on a shipped order — status changes to `delivered`, an `order.delivered` event fires for n8n (e.g., triggers the 2-day feedback request workflow)

**Cancel / Refund:**
- **Cancel** is available on Pending/Processing orders (confirmation required)
- **Refund** is available on Delivered or Canceled orders

### Shipment Tracking
On the order detail page:
- Carrier, tracking number, and tracking URL are shown
- Click **"Track Shipment →"** to open the tracking URL in a new tab
- For already-shipped orders, you can update tracking info using **"Update Tracking Info"**

### WhatsApp Bot Integration
Customers can ask the bot for order status directly in WhatsApp:
- *"Where is my order ORD-2601-0001?"* → bot replies with status and tracking
- *"Where is my order?"* → bot looks up the last 3 orders by the customer's phone number
- The bot recognises order numbers automatically and replies with formatted status, items, and shipment info

---

## 6. Analytics *(Admin/Owner + Agent)*

View business intelligence metrics (read-only).

### Overview Cards
| Metric | Description |
|---|---|
| Total Conversations | Count + active conversations |
| Total Cases | Count + open cases |
| Avg Response Time | In minutes |
| SLA Breaches | Total breaches (red) |

### Intent Distribution
Horizontal bar chart showing the top 8 customer intents (e.g., greeting, refund, order tracking).

### Agent Performance Table
Shows per-agent: Assigned count, Resolved count, Average Response Time.

### SLA Performance by Priority
Shows per-priority level: Total, Resolved, Breached, SLA Compliance %, Avg Response Time, Avg Resolution Time.
- Compliance color: **Green** >= 90%, **Yellow** >= 70%, **Red** < 70%

---

## 7. Billing

Manage your subscription plan and monitor usage.

### Access
- **Owner:** Full access — can view usage, upgrade plans, and manage subscription via Stripe
- **Admin / Agent:** View-only — can see current plan and usage, but cannot upgrade or manage billing. A yellow info banner explains that only the account owner can make changes.

### Current Plan
The banner at the top shows your active plan (FREE / PRO / BUSINESS) and the current period end date.

### Usage Bars
Tracks this month's usage against your plan limits:
- **Inbound Messages** — WhatsApp messages received from customers
- **Outbound Messages** — Messages and templates sent to customers
- **Automation Events** — n8n workflow triggers dispatched
- **AI Calls** — AI fallback intent detection calls used

Progress bars change colour as limits approach: **blue** (normal) → **orange** (80%+) → **red** (95%+).

### Upgrading Your Plan
The plan comparison cards show what's included at each tier:

| Feature | FREE | PRO | BUSINESS |
|---|---|---|---|
| Agents | 1 | 3 | 10 |
| Inbound/month | 500 | 5,000 | 50,000 |
| AI Calls/month | 50 | 1,000 | 10,000 |
| Automation (n8n) | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |

Click **"Upgrade to Pro"** or **"Upgrade to Business"** — you'll be redirected to the Stripe checkout page. After successful payment, your plan is upgraded immediately.

### Managing Your Subscription
Click **"Manage Subscription"** to open the Stripe Customer Portal where you can:
- Update your payment method
- View invoices
- Cancel or change your plan

---

## 8. Team *(Owner/Admin only)*

Manage your support team members.

### Team List
- Shows all team members with their **Name**, **Email**, **Role** (badge), **Status** (Active/Inactive), and **Join Date**
- A **Team Members** usage bar at the top shows how many member slots are used vs. your plan limit (e.g., 2 / 3 for Pro)

### Plan Limits
| Plan | Max Team Members |
|---|---|
| FREE | 1 (owner only) |
| PRO | 3 (owner + 2) |
| BUSINESS | 10 (owner + 9) |

### Adding a Team Member
1. Click **"+ Add Member"**
2. Fill in: **Name**, **Email**, **Password** (min 8 characters), **Role** (Agent or Admin)
3. Click **Create**
4. If your plan limit is reached, you'll see an error message — upgrade your plan to add more members

### Editing a Team Member
1. Click **Edit** next to the member
2. Modify **Name** or **Role**
3. Click **Save**
4. **Note:** Email cannot be changed. The owner account cannot be edited.

### Deactivating / Activating a Member
- Click **Deactivate** to prevent a member from logging in (they remain in the system)
- Click **Activate** to restore access
- The owner account cannot be deactivated

> **Mobile:** Team members are shown as cards instead of a table.

---

## 9. Settings

### User Profile
Displays your Name, Email, Role, and Tenant ID (read-only).

### WhatsApp Configuration *(Admin/Owner only)*
**To connect WhatsApp:**
1. Get credentials from **Meta Business Manager > WhatsApp > API Setup**
2. Fill in: Phone Number ID, Display Phone, WABA ID, Access Token, App Secret, Webhook Verify Token
3. Click **Connect WhatsApp**

**Once connected:**
- Green banner shows connection status and phone number
- You can update the **Catalog ID** separately

### Policies *(Admin/Owner only)*
Under the **Policies** tab:
- **Return Policy** — textarea
- **Shipping Policy** — textarea
- **FAQ Content** — textarea
- **Business Hours** — toggle each day (Mon-Sun) and set open/close times
- **Timezone** — select from available timezones
- **Auto Reply Delay** — in milliseconds
- Click **Save Policies**

### Language & Tone *(Admin/Owner only)*
Under the **Language & Tone** tab:
- **Default Language** — EN (English), SI (Sinhala), TA (Tamil). The bot uses this language for all replies unless overridden
- **Tone** — FRIENDLY (warm, conversational), FORMAL (professional), SHORT (brief, minimal)
- **Auto-detect Language** — when enabled, the bot detects Sinhala/Tamil Unicode characters in the customer's message and switches the reply language automatically
- Click **Save Language Settings** after making changes

> **Tip:** If a customer types "සිංහල" or "sinhala" the bot will switch to Sinhala for that conversation regardless of the default language setting.

### Response Templates *(Admin/Owner only)*
Under the **Templates** tab:
- Click **"+ Create Template"** to add a new one manually
- Click **"Sync from Meta"** to import all message templates from your WhatsApp Business account (requires WABA ID to be set in the WhatsApp connection)
- Fields: **Intent** (e.g., `greeting`), **Name**, **Body** (supports `{{placeholder}}` syntax), **Language** (EN/SI/TA), **Tone** (FRIENDLY/FORMAL/SHORT), Active toggle
- The bot selects the best-matching template using a 4-step fallback: matching language+tone → EN+tone → language+FRIENDLY → EN+FRIENDLY
- Edit or Delete existing templates from the table

**Table columns:**
| Column | Description |
|--------|-------------|
| Intent | The trigger intent for this template |
| Name | Template name |
| Active | **Active** (green) / **Inactive** (gray) |
| Meta | Approval status from Meta: **APPROVED** (green) / **PENDING** (yellow) / **REJECTED** (red) / **Local** (manually created) |

**Sync from Meta behaviour:**
- Fetches all message templates registered in your WhatsApp Business account
- Creates or updates matching local templates (matched by name + language)
- Sets the template active/inactive based on Meta's approval status
- Templates with no body component (e.g., media-only) are skipped
- Requires the WABA ID to be set under WhatsApp Configuration

**Supported template variables:**
`{{customer_name}}`, `{{business_name}}`, `{{product_name}}`, `{{price}}`, `{{currency}}`, `{{stock}}`, `{{order_id}}`, `{{hours}}`, `{{location}}`, `{{shipping_policy}}`, `{{returns_policy}}`, `{{agent_name}}`, `{{today_date}}`, `{{today_time}}`

### AI Settings *(Admin/Owner only)*
Under the **AI** tab:
- **Enable AI-powered responses** — toggle switch to enable/disable AI for your tenant
- When enabled, AI will classify messages that don't match keyword rules and generate contextual replies
- **Usage bar** shows your current AI calls used vs. your plan limit (e.g., 12 / 50 for Free plan)
- Progress bar changes colour as limits approach: **blue** (normal) → **orange** (80%+) → **red** (95%+)
- AI is billed per call — each intent detection or response generation counts as one call

> **Note:** AI requires the server to have an AI provider configured (`AI_PROVIDER` env var set to `anthropic`, `openai`, or `gemini`). If no provider is configured, the toggle has no effect.

### n8n Automation
- Displays the **Webhook URL** for your n8n workflows
- Click **Copy** to copy the URL
- Add the `X-Automation-Key` header in your n8n workflow configuration
- See `docs/N8N_WORKFLOWS.md` for workflow setup guides

---

## 10. Role Permissions

| Feature | Owner/Admin | Agent |
|---|---|---|
| View Inbox & reply | Yes | Yes |
| Assign conversations | Yes | Yes (self only) |
| View/edit Cases | Yes | Yes |
| Add/Edit/Delete Products | Yes | No (view only) |
| CSV Import | Yes | No |
| View Orders | Yes | Yes |
| Create/Update Orders | Yes | No |
| Mark Shipped/Delivered/Cancel/Refund | Yes | No |
| Configure WhatsApp | Yes | No |
| Edit Policies, Templates, Language & Tone | Yes | No |
| Configure AI settings | Yes | No |
| View Analytics | Yes | Yes |
| View Billing & Usage | Yes | Yes (view-only) |
| Upgrade/Manage Subscription | Yes (owner only) | No (info banner shown) |
| View Team Members | Yes | Yes (view only) |
| Add/Edit/Deactivate Team Members | Yes | No |

---

## 11. Common Workflows

### Responding to a Customer
1. Go to **Inbox** > click conversation > **Assign to Me** > type reply > **Send**

### Managing a Support Case
1. Go to **Cases** > click case > review details > **Edit** > update status/priority/notes > **Save**

### Bulk Importing Products
1. Go to **Products** > **Import CSV** > select file > **Import** > review results

### Shipping an Order
1. Go to **Orders** > click an order in Pending/Processing status
2. Fill in Carrier, Tracking Number, Tracking URL in the Shipment panel
3. Click **"Mark Shipped"** — customer can now query order status via WhatsApp

### Adding a Support Agent
1. Go to **Team** > click **"+ Add Member"**
2. Enter name, email, password, and select **Agent** role
3. Click **Create** — the new agent can now log in and handle conversations

### Setting Up WhatsApp
1. Go to **Settings** > fill in WhatsApp credentials > **Connect WhatsApp** > optionally set Catalog ID

### Configuring Multi-Language Replies
1. Go to **Settings** > **Language & Tone** tab
2. Set Default Language, Tone, and Auto-detect toggle
3. Click **Save Language Settings**
4. Go to **Templates** tab to create SI/TA versions of your templates if needed

### Syncing Templates from Meta
1. Go to **Settings** > **Templates** tab
2. Ensure your WhatsApp connection has a **WABA ID** set (WhatsApp Configuration section)
3. Click **"Sync from Meta"**
4. Approved templates are imported; the **Meta** column shows their approval status

### Enabling AI Responses
1. Go to **Settings** > **AI** tab
2. Toggle **"Enable AI-powered responses"** on
3. The bot will now use AI to classify messages that don't match keyword rules
4. AI will also generate contextual replies when no template matches
5. Monitor usage in the AI tab or on the **Billing** page

### Upgrading Your Plan
1. Go to **Billing** > click **"Upgrade to Pro"** or **"Upgrade to Business"**
2. Complete Stripe checkout
3. Return to dashboard — plan is upgraded immediately
