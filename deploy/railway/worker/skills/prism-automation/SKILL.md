---
name: prism-automation
description: "Extract business automation logic from SPA JavaScript bundles and marketing pages. Maps automation systems (triggers, workflows, campaigns, agents), extracts API endpoints, feature flags, pricing models, and third-party integrations. Use on any web application to reverse-engineer its automation architecture."
allowed-tools: ["Read", "Grep", "Glob", "Bash", "Write", "Edit"]
---

# Prism Automation — Reverse-Engineer Business Automation Logic from SPAs

You extract automation architecture from JavaScript bundles and marketing pages. You work in four phases. All are mandatory.

## PHASE 1: Harvest

Identify and download the application's main JS bundle(s):

1. **Find the SPA entry point**: Fetch the page HTML, extract all `<script src="...">` tags, size them via `Content-Length`. The largest JS file (usually >500KB) is the main bundle.
2. **Find the CDN base**: Bundles are often served from a separate CDN domain (e.g., `stcdn.leadconnectorhq.com`). Note the base URL for chunk resolution.
3. **Download the bundle**: Use `curl -sL <URL> -o /tmp/<name>.js`. For 3MB+ files, use background download (`&`).
4. **Resolve dynamic chunks**: Vite/Rollup bundles embed a dependency map. Extract chunk paths with:
   ```
   rg -oP '"\./[A-Za-z0-9_-]+\.js"' <bundle> | sort -u
   ```
5. **Download chunks in parallel**: `for c in $(<chunks>); do curl -sL "$base/$c" -o "/tmp/$c" & done; wait`
6. **Get marketing page**: Also download the marketing page for feature descriptions, pricing, screenshots:
   ```
   curl -sL https://example.com | sed 's/<[^>]*>//g' | sed '/^$/d' | head -500
   ```

## PHASE 2: Scan

Apply these scans to every downloaded bundle:

### Scan A — Business Entities
```bash
rg -oP '(Pipeline|Contact|Opportunity|Deal|Workflow|Campaign|Automation|Trigger|Action|Condition|Step|Funnel|Email|SMS|Call|Review|Membership|Booking|Calendar|Invoice|Payment|Subscription|Template|Sequence|Tag|Note|Task|Appointment|Conversation|Agent|Employee|Cycle|Grant|QA|Quality)' <bundle>
```

### Scan B — API Endpoints
```bash
rg -oP '/api/[a-zA-Z0-9/_-]+' <bundle> | sort -u
```

Also search for:
- GraphQL: `rg -oP '(gql|graphql|query|mutation|subscription)'`
- Dynamic routes: `rg -oP '"/(:[a-zA-Z]+|{.*?})/[a-zA-Z]+"'`
- API base URLs: `rg -oP '(apiBase|baseURL|baseUrl|apiUrl|endpoint)'`

### Scan C — Feature Flags
```bash
rg -oP '"[A-Z_]+_?(ENABLED|FEATURE|FLAG)"' <bundle>
rg -oP '(isEnabled|featureFlag|FeatureFlag|experiment|variant)' <bundle>
```

### Scan D — Third-Party Integrations
```bash
rg -oP '(stripe|twilio|sendgrid|mailgun|openai|anthropic|google|facebook|hubspot|salesforce|zapier|calendly|clickfunnels|typeform|mailchimp|sendinblue|leadconnector|gohighlevel|segment|mixpanel|intercom|freshchat|hotjar|fullstory|sentry|datadog|logrocket|amplitude)' <bundle> | sort -u
```

### Scan E — Subscription / Pricing Logic
```bash
rg -oP '(plan|tier|subscription|pricing|price|stripe|checkout|billing|invoice|upgrade|downgrade|cancel)' <bundle> | sort -u
```

### Scan F — Routing / Dashboard Pages
```bash
rg -oP '(path:|route:|/dashboard/|/app/|/settings/|/admin/)' <bundle> | sort -u
```

### Scan G — Automation-Specific
```bash
rg -oP '(trigger|action|condition|workflow|work-flow|automation|sequence|campaign|broadcast|drip|schedule|delay|filter|segment|audience)' <bundle> | sort -u
```

## PHASE 3: Map

Build a structured map of the automation system:

### Automation Engine Architecture
- **Trigger types**: What starts automation flows? (form submit, email received, tag added, payment made, booking scheduled, etc.)
- **Action types**: What can automation do? (send email, send SMS, update contact, add tag, create task, make API call, etc.)
- **Condition/Branching**: How does the system handle conditional logic? (if/else, split, wait, delay, loop)
- **Workflow execution model**: Sequential, parallel, event-driven, cron-scheduled
- **Campaign model**: Multi-step sequences vs single-step broadcasts vs triggered drips
- **State management**: How is contact/lead state tracked through automation flows?

### Agent / Employee Systems (AI-powered)
- **Agent types**: What specialized AI agents exist? (sales agent, support agent, content writer, researcher, QA agent)
- **Agent lifecycle**: How are agents created, trained, deployed, monitored?
- **Agent triggers**: What activates an AI agent? (manual assignment, automatic routing, event-based)
- **Agent memory/persistence**: Does the agent maintain context across interactions?

### VC Funding / Investment Automation (if present)
- **Deal pipeline stages**: sourcing → due diligence → term sheet → closing → portfolio
- **Automated screening**: AI-driven startup evaluation criteria (founder background, traction, market size)
- **Investor matching**: Algorithmic matching of startups to investors
- **Document generation**: Automated term sheet, SAFE note, investment agreement generation
- **CAP table management**: Equity tracking, investor dashboard
- **Pitch deck analysis**: Scoring startups based on deck content, financial projections

### Business Entity Model
```
Platform: [gohighlevel / other]
Core Entity: [Contact / Lead / Deal / Company / Agent]
├── Properties: [name, email, phone, status, tags, customFields]
├── Automation:
│   ├── Triggers: [...]
│   ├── Actions: [...]
│   └── Sequences: [...]
├── Communication:
│   ├── Channels: [email, SMS, call, chat]
│   └── Templates: [...]
├── Integrations: [...]
└── Payment/Billing:
    ├── Plans: [...]
    └── Subscription: [monthly, annual, usage-based]
```

## PHASE 4: Synthesize

Compile findings into actionable structures:

### Feature Table
| Feature | Implementation | API Endpoint | Notes |
|---------|---------------|--------------|-------|
| Workflows | Trigger → Action → Condition chain | `/api/workflows/` | Supports branching |
| Campaigns | Multi-step scheduled sequences | `/api/campaigns/` | Drip email, SMS |
| AI Agents | LLM-powered task execution | `/api/agents/` | Custom instructions |
| ... | ... | ... | ... |

### Integration Map (how third-party services connect)
- **Payments**: Stripe (subscriptions, invoices, payment intents)
- **Email**: SendGrid / Mailgun / SMTP
- **SMS**: Twilio
- **AI**: OpenAI / Anthropic
- **Calendar**: Calendly / Google Calendar
- **Analytics**: Mixpanel / Amplitude / Segment

### Pricing Architecture
```json
{
  "free_tier": {"features": [...], "limits": {...}},
  "paid_plans": [
    {"name": "Standard", "price": 49, "interval": "month", "features": [...]},
    {"name": "AI Employee", "price": "$1.63/day", "interval": "day", "features": [...]}
  ],
  "billing_provider": "stripe"
}
```

### Automation Flow Patterns
1. **Event → Filter → Action**: Triggered by event, filtered by conditions, executes action
2. **Schedule → Sequence → Action**: Time-based, executes sequence of actions
3. **Agent → Task → Review → Approve**: AI agent completes task, human reviews, approved action taken
4. **Campaign → Segment → Step → Send**: Campaign targets segment, executes steps in order

## Output Format

End with a structured findings block:

```
---
PLATFORM: [name]
AUTOMATION_ENGINE: [trigger-based / agent-based / campaign-based / hybrid]
CORE_ENTITIES: [...]
API_BASE: [URL]
INTEGRATIONS: [...]
FEATURE_FLAGS: [...]
PRICING_MODEL: [...]
AUTOMATION_PATTERNS: [list of pattern descriptions]
---
```
