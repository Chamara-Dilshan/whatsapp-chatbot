# 💬 WhatsApp Business Support Bot SaaS

A comprehensive, multi-tenant WhatsApp Business API support bot with AI-powered intent detection, agent inbox, case management, SLA tracking, and n8n automation.

## ✨ Features

### 🤖 Automated Customer Support
- WhatsApp Business API integration
- AI-powered intent detection (8 pre-built intents)
- Automatic conversation routing
- Template-based responses
- Product catalog integration with fuzzy search
- 24-hour messaging window management
- Opt-in/opt-out handling

### 👥 Agent Workspace
- **Inbox Dashboard** - Manage customer conversations (responsive mobile/desktop)
- **Live Chat Interface** - Reply to customers in real-time
- **Conversation Assignment** - Assign chats to specific agents
- **Case Management** - Full case CRUD with detail modal, SLA indicators
- **SLA Tracking** - Monitor response and resolution times with color-coded alerts
- **Priority Management** - Urgent, high, medium, low priorities
- **Product Catalog** - CRUD operations, fuzzy search, CSV bulk import
- **Settings Management** - WhatsApp config, policies, templates, n8n automation
- **Mobile-Friendly** - Hamburger menu, touch-friendly buttons, adaptive layouts

### 📊 Analytics & Reporting
- Overview metrics (conversations, cases, response times)
- Intent distribution analysis
- Agent performance tracking
- SLA compliance monitoring
- Customizable date ranges
- Visual dashboards

### 🔄 Automation (n8n Integration)
- Event-driven automation workflows
- Slack/Teams/Email notifications
- High-priority case alerts
- SLA breach warnings
- Custom workflow support
- Retry mechanism with exponential backoff

### 🏢 Multi-Tenant Architecture
- Complete tenant isolation
- Per-tenant configurations
- Custom policies and templates
- Encrypted credentials storage
- Role-based access control

## 🚀 Quick Start

**Get up and running in 5 minutes:**

```bash
# 1. Install dependencies
pnpm install

# 2. Start database
docker-compose up -d

# 3. Setup database
cd apps/api
pnpm prisma db push && pnpm prisma db seed

# 4. Start API (Terminal 1)
pnpm dev

# 5. Start Dashboard (Terminal 2)
cd apps/dashboard
pnpm dev
```

**Access the dashboard:** http://localhost:3001
**Login:** owner@acme.test / password123

📖 **Detailed guide:** [RUNNING.md](RUNNING.md) | **Quick reference:** [QUICKSTART.md](QUICKSTART.md)

## 📁 Project Structure

```
whatsapp-chatbot/
├── apps/
│   ├── api/                    # Express.js backend API
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── automation/ # n8n integration
│   │   │   │   ├── case/       # Case management
│   │   │   │   ├── inbox/      # Agent inbox
│   │   │   │   ├── analytics/  # Metrics & SLA
│   │   │   │   ├── intent/     # AI intent detection
│   │   │   │   └── whatsapp/   # WhatsApp API
│   │   │   ├── middleware/     # Auth, validation
│   │   │   └── lib/            # Utilities
│   │   └── prisma/             # Database schema & migrations
│   │
│   └── dashboard/              # Next.js frontend
│       ├── src/
│       │   ├── app/            # Pages (App Router)
│       │   │   ├── login/      # Authentication
│       │   │   └── dashboard/  # Main app
│       │   │       ├── inbox/     # Conversation management
│       │   │       ├── cases/     # Case tracking & SLA
│       │   │       ├── products/  # Product catalog CRUD
│       │   │       ├── analytics/ # Metrics dashboard
│       │   │       └── settings/  # WhatsApp, policies, templates
│       │   ├── components/     # Reusable React components
│       │   │   ├── Sidebar.tsx      # Responsive navigation
│       │   │   ├── Modal.tsx        # Reusable modal dialog
│       │   │   ├── Badge.tsx        # Status/priority badges
│       │   │   ├── EmptyState.tsx   # Empty state placeholder
│       │   │   ├── LoadingSpinner.tsx # Loading indicator
│       │   │   └── ResponsiveTable.tsx # Mobile-friendly tables
│       │   ├── hooks/          # Custom React hooks
│       │   │   └── useDebounce.ts   # Search debouncing
│       │   ├── contexts/       # Auth context
│       │   └── lib/            # API client
│
├── packages/
│   └── shared/                 # Shared types & constants
│
├── docs/                       # Documentation
│   ├── PHASE4_SUMMARY.md      # Complete feature guide
│   └── N8N_WORKFLOWS.md       # Automation setup
│
├── PLAN.md                    # Development roadmap
├── RUNNING.md                 # Detailed setup guide
└── QUICKSTART.md              # 5-minute setup
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **ORM:** Prisma
- **Authentication:** JWT
- **Encryption:** AES-256-GCM
- **Search:** pg_trgm (fuzzy text search)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + Tailwind CSS
- **State:** React Context API
- **Styling:** Tailwind CSS + clsx
- **Responsive Design:** Mobile-first, fully responsive (375px - 4K)

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Monorepo:** pnpm workspaces
- **Automation:** n8n (optional)
- **API Integration:** WhatsApp Business API

## 📊 Development Status

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Foundation, monorepo, Prisma schema, Docker |
| **Phase 2** | ✅ Complete | Webhook core, auth APIs, intent engine |
| **Phase 3** | ✅ Complete | Products backend, search, catalog integration |
| **Phase 4** | ✅ Complete | Inbox, cases, SLA, analytics, n8n, **full dashboard UI** |

**See [PLAN.md](PLAN.md) for detailed roadmap**

## 🔑 Key Features Deep Dive

### Intent Detection Engine

8 pre-built intent rules:
- Greeting detection
- Agent request ("speak to human")
- Complaint identification
- Product inquiries
- Price/availability questions
- Hours & location
- Policy questions (return, shipping)
- Opt-out/opt-in

### Product Catalog Management

**Full CRUD Dashboard:**
- ✨ Create/Edit/Delete products with modal forms
- 🔍 Debounced search with fuzzy matching (pg_trgm)
- 🎯 Category & stock status filters
- 📤 CSV bulk import with error reporting
- 📄 Pagination (20 items per page)
- 📱 Responsive tables (desktop) → cards (mobile)
- 🔒 Role-based access (owner/admin only)

**Features:**
- Product images with preview
- Multi-currency support (USD, EUR, GBP, INR)
- Keywords for search optimization
- Stock tracking (in/out of stock)
- Category management
- WhatsApp catalog integration

### Case Management Dashboard

**Full Case Tracking UI:**
- 📊 Real-time stats (Total, Open, In Progress, Resolved, SLA Breached)
- 🎯 Advanced filters (status, priority, assigned to, my cases)
- 🚦 Color-coded SLA indicators:
  - 🟢 Green: On track (>2 hours remaining)
  - 🟡 Yellow: Approaching deadline (<2 hours)
  - 🔴 Red: Breached (past deadline)
- 👁️ Case detail modal (view/edit modes)
- 📝 Edit fields: subject, status, priority, tags, notes, resolution
- 👤 Quick actions: Assign to Me, Close Case
- 📱 Responsive design (cards on mobile)

**SLA Tracking:**
- Automatic SLA deadlines by priority:
  - Urgent: 4 hours
  - High: 8 hours
  - Medium: 24 hours
  - Low: 48 hours
- First response time tracking
- Resolution time tracking
- Case notes and tags
- Conversation linking

### Settings Dashboard

**WhatsApp Configuration:**
- 🔗 Connect WhatsApp Business API
- 📱 Phone number & credentials management
- 🔐 Secure token storage with show/hide toggles
- 📦 Catalog ID configuration
- ✅ Connection status display

**Policies & Templates:**
- **Policies Tab:**
  - Return/Shipping/FAQ policies editor
  - Business hours (per-day checkboxes + time pickers)
  - Timezone selector
  - Auto-reply delay configuration
- **Templates Tab:**
  - Reply template CRUD (intent-based)
  - Active/inactive status management
  - Placeholder support ({{customerName}}, etc.)

**n8n Automation:**
- Webhook URL display with copy button
- Setup instructions for n8n workflows
- X-Automation-Key header configuration

### Automation Events

5 event types:
- `case_created` - New case notification
- `high_priority_case` - Urgent alerts
- `case_assigned` - Assignment notifications
- `case_resolved` - Resolution updates
- `sla_breach` - SLA deadline exceeded

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/whatsapp_bot

# API
API_PORT=4000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-min-16-chars
ENCRYPTION_KEY=64-char-hex-key

# WhatsApp
WEBHOOK_VERIFY_TOKEN=your-verify-token

# Automation (optional)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/whatsapp-events
AUTOMATION_API_KEY=your-automation-key

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### WhatsApp Business API Setup

1. Get credentials from Meta/Facebook
2. Configure webhook URL: `https://your-domain.com/webhook/whatsapp`
3. Update tenant via API with credentials
4. Verify webhook with token
5. Start receiving messages


## 🔒 Security Features

- JWT authentication with secure tokens
- AES-256-GCM encryption for credentials
- Password hashing with bcrypt
- WhatsApp webhook signature verification
- API key protection for automation endpoints
- Tenant data isolation
- CORS configuration
- Role-based access control

## 🧪 Testing

### API Health Check
```bash
curl http://localhost:4000/health
# Response: {"status":"ok"}
```

### Login Test
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@acme.test","password":"password123"}'
```

### Database Test
```bash
docker exec -it whatsapp-bot-db psql -U whatsapp_bot -d whatsapp_bot -c "SELECT COUNT(*) FROM \"Tenant\";"
```

## 🤝 Contributing

This is a complete SaaS implementation. To extend:

1. Add new intent rules in `apps/api/src/services/intent/rules/`
2. Create new API endpoints in `apps/api/src/routes/`
3. Add dashboard pages in `apps/dashboard/src/app/dashboard/`
4. Implement n8n workflows using templates in `docs/N8N_WORKFLOWS.md`

## 📝 License

This project is for educational and commercial use.

## 🆘 Support & Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

**Database won't connect:**
```bash
docker-compose down
docker-compose up -d
```

**Login fails:**
```bash
cd apps/api
pnpm prisma db seed
```

**For more help:** See [RUNNING.md#troubleshooting](RUNNING.md#troubleshooting)

## 🎯 Use Cases

- **E-commerce Support** - Product inquiries, order status
- **Customer Service** - FAQ, complaints, escalations
- **Lead Generation** - Capture and qualify leads
- **Appointment Booking** - Schedule and manage appointments
- **Multi-location Business** - Branch-specific routing

## 🌟 Highlights

- ✅ Production-ready architecture
- ✅ **Fully Responsive Design** - Mobile, tablet, desktop (375px to 4K)
- ✅ **Complete Dashboard UI** - All features fully implemented
  - Products page with CRUD, search, CSV import
  - Cases page with SLA tracking & detail modal
  - Settings page with WhatsApp, policies, templates
  - Reusable components (Modal, Badge, EmptyState, LoadingSpinner)
- ✅ Comprehensive test data included
- ✅ Full TypeScript support
- ✅ Monorepo structure
- ✅ Docker-based development
- ✅ Scalable multi-tenant design
- ✅ Extensive documentation
- ✅ n8n automation integration
- ✅ Real-time agent inbox
- ✅ SLA tracking & analytics

---

**Built with ❤️ for customer support excellence**

🚀 **[Get Started Now](QUICKSTART.md)** | 📖 **[Full Documentation](RUNNING.md)** | 📋 **[Roadmap](PLAN.md)**
