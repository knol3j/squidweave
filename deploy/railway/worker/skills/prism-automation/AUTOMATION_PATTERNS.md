# Automation Architecture: polsia.com & gohighlevel.com

## Case Study 1: Polsia (AI Employee Platform)

### Platform Profile
- **Stack**: Vite + React SPA, Express backend, Sentry (`sentryRelease: polsia@0.0.0+d4c16c5`)
- **Hosting**: Render, behind Cloudflare
- **Pricing**: $49/mo Standard, AI Employee "$1.63/day" pitch
- **Billing**: Stripe (subscriptions, invoices, payment methods, billing portal)

### Core Automation Entity Model

```
Polsia
├── Agent (AI Employee)
│   ├── name, description, instructions (system prompt)
│   ├── tools (capabilities granted to agent)
│   ├── status (active/suspended/archived)
│   └── human_review_required (QA flag)
├── Campaign
│   ├── status (draft/active/paused/completed)
│   ├── steps (ordered sequence of actions)
│   └── schedule / trigger
├── OperatingCycle
│   ├── current_step
│   ├── state data
│   └── status
├── Task
│   ├── assignee (agent or human)
│   ├── status (pending/in_review/completed/failed)
│   └── review_required
├── WorkflowTemplate (pre-built automation recipes)
│   ├── triggers, conditions, actions
│   └── category
├── Grant (credit/usage system)
│   ├── amount, used, expires_at
│   └── grant_type
└── Subscription
    ├── plan_id, status, current_period_end
    └── features (feature flags)
```

### Automation Engine

**Trigger types** (extracted from bundle):
- Form submission
- Contact created/updated
- Tag added/removed
- Payment received
- Booking scheduled
- Email opened/clicked
- SMS replied
- Calendar event
- Webhook received
- Schedule (cron/time-based)
- Agent completion event

**Action types**:
- Send email (template or custom)
- Send SMS
- Make API call (webhook)
- Update contact/entity
- Add/remove tag
- Create task
- Wait/delay
- Conditional branch
- Loop/iterate
- Assign to agent
- Request human review
- Generate content (AI)
- Score/qualify lead

**AI Agent Architecture**:
- Agents have custom "instructions" (system prompts)
- Agents are assigned tools (capability grants)
- Operating cycles track multi-step agent execution
- Quality Assurance step: AI review → human review → approval flow
- Multiplayer: team collaboration with roles

**Feature Flags** (extracted):
- Campaign creation limits by plan
- AI Employee feature flag
- Multiplayer/team features
- QA/review system
- Grant-based usage tracking

### API Structure
- Base: `/api/`
- RESTful pattern with CRUD endpoints
- Auth: Bearer token (likely JWT-based)

### Automation Flow Patterns

**Pattern 1: Campaign Drip**
```
Campaign[active] → Steps[ordered] → Each Step:
  ├── Filter segment
  ├── Wait/delay (if scheduled)
  ├── Execute action (email/SMS/task)
  └── Log result
```

**Pattern 2: AI Agent Operating Cycle**
```
Agent[instructions + tools] → Task Assignment → 
  ├── AI processes task autonomously
  ├── QA check:
  │   ├── AI QA pass (self-review)
  │   └── Human review (if flagged)
  ├── Action executed or rejected
  └── Cycle complete → next task
```

**Pattern 3: Trigger → Workflow**
```
Event → Trigger matched → Conditions evaluated →
  ├── All conditions pass → Execute workflow actions
  └── Condition fails → Log, no action
```

---

## Case Study 2: GoHighLevel (GHL)

### Platform Profile
- **Stack**: Vite + React SPA (stcdn.leadconnectorhq.com CDN), monolithic chunk structure
- **Positioning**: All-in-one marketing/sales platform for agencies
- **Pricing**: Agency model (white-label), tiered plans
- **Billing**: Stripe-powered

### Core Business Entities (extracted from bundle)

| Entity | Description | Key Operations |
|--------|-------------|----------------|
| Pipeline | Sales pipeline with stages | CRUD, stage management |
| Contact | Lead/customer record | Create, update, merge, import |
| Opportunity | Deal in pipeline | Create, move stage, win/loss |
| Workflow | Automation workflow | Trigger, action, condition |
| Campaign | Marketing campaign | Multi-step sequences |
| Funnel | Sales funnel builder | Page builder, steps |
| Email | Email communications | Send, template, track |
| SMS | SMS communications | Send, track, reply |
| Call | Phone call tracking | Log, record, track |
| Review | Reputation management | Collect, respond, analyze |
| Membership | Membership site | Content, access control |
| Booking | Appointment scheduling | Calendar, availability |
| Invoice | Billing/invoicing | Create, send, collect |
| Payment | Payment processing | Collect, refund, receipt |
| Subscription | Recurring billing | Plans, billing cycles |
| Tag | Contact labeling | Create, assign, automate |
| Note | Contact notes | Create, attach |
| Template | Message templates | Email, SMS, page |
| Sequence | Automated message sequence | Drip campaigns |
| Conversation | Threaded communication | SMS, email, chat |

### Automation Engine (GHL)

**Trigger types**:
- Contact created/updated
- Tag added/removed
- Opportunity stage changed
- Form submitted
- Survey completed
- Appointment scheduled
- Invoice paid/overdue
- Review received
- Email/SMS replied
- Webhook received
- Date/time condition met

**Action types**:
- Send email (template or custom)
- Send SMS
- Update contact fields
- Add/remove tags
- Create task
- Create note
- Add to campaign
- Remove from campaign
- Add to workflow
- Create opportunity
- Change pipeline stage
- Make HTTP request (webhook)
- Condition/split (if/else)
- Wait/delay
- End workflow

**Business Automation Patterns**:

**Pattern 1: Lead Funnel**
```
Lead Capture → Tag assigned → Workflow triggered:
  ├── Email sequence (drip: day 1, 3, 7)
  ├── SMS follow-up (day 1)
  ├── Task for sales rep (day 3 if no response)
  ├── Opportunity created in Pipeline
  └── Score lead based on engagement
```

**Pattern 2: Booking → Payment → Follow-up**
```
Booking scheduled → Payment collected →
  ├── Confirmation email + SMS
  ├── Calendar event created
  ├── Reminder sequence (24h, 1h before)
  ├── Post-appointment: review request
  └── Tag: "appointment_completed"
```

**Pattern 3: Pipeline Automation**
```
Opportunity created → Stage 1 (New Lead):
  ├── Auto-assign to round-robin rep
  ├── Email intro sequence
  ├── Move to Stage 2 (Contacted) after 24h
  └── If no response in 7 days → move to Stage 6 (Lost)
Stage change → Trigger actions per-stage
Stage 4 (Negotiation) → Invoice auto-generated
Stage 5 (Closed Won) → Welcome sequence, membership grant
```

### Integrations
- **Google**: Gmail, Google Calendar, Google Ads, Google Business Profile
- **Facebook**: Messenger, Ads, Lead Ads
- **Stripe**: Payment processing, subscriptions, invoicing
- **Twilio** (implied): SMS capabilities
- **Zapier**: API/webhook integration with 5000+ apps

### Pricing Model
- White-label agency pricing
- Tiered: Starter ($97/mo), Unlimited ($297/mo), Agency Pro ($497/mo), Custom Enterprise
- SaaS mode: sub-accounts under agency
- Stripe Connect for sub-account billing

---

## Cross-Platform Patterns

### Common Automation Architecture

```
┌─────────────────────────────────────────┐
│            Automation Engine             │
│  ┌─────────┐  ┌──────┐  ┌───────────┐  │
│  │ Triggers │→│Filters│→│  Actions   │  │
│  └─────────┘  └──────┘  └───────────┘  │
│         ┌──────────────────┐            │
│         │  Workflow/Sequence            │
│         │  (ordered steps)              │
│         └──────────────────┘            │
└─────────────────────────────────────────┘
```

### Shared Third-Party Stack
| Service | Polsia | GHL | Purpose |
|---------|--------|-----|---------|
| Stripe | ✅ | ✅ | Payments & billing |
| Google | ✅ | ✅ | Email, calendar, auth |
| Facebook | - | ✅ | Ads, messenger |
| OpenAI/Anthropic | ✅ (implied) | - | AI agent capability |
| Twilio | - | ✅ (implied) | SMS/calling |
| Zapier/Webhook | ✅ | ✅ | External integrations |

### Key Differences
| Dimension | Polsia | GHL |
|-----------|--------|-----|
| Core Focus | AI Agents ("AI Employees") | Sales/Marketing Agency Platform |
| Automation Model | AI-driven agent cycles | Trigger-based workflows |
| AI Integration | Native (LLM agents) | Limited (via Zapier) |
| Target User | SMBs, solopreneurs | Marketing agencies |
| White-label | No | Yes (core feature) |
| Grant System | Yes (usage credits) | No (flat subscription) |
| Multiplayer | Yes | Yes (agency/sub-account model) |
| Billing | Stripe subscriptions | Stripe Connect (sub-accounts) |
