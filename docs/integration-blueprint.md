# Integration Blueprint

LocaleWeave can run safely without secrets, but live execution and procedural learning only improve when real external signals are connected.

## Connector Environment

Live connector credentials:

- `OPENCLAW_BASE_URL`
- `OPENCLAW_TOKEN`
- `CLAWDBOT_BASE_URL`
- `CLAWDBOT_TOKEN`

Optional persistent memory backend:

- `HERMES_BASE_URL`
- `HERMES_TOKEN`
- `HERMES_HEALTH_PATH`
- `HERMES_MEMORY_UPSERT_PATH`
- `HERMES_MEMORY_RECALL_PATH`

Legacy compatibility aliases:

- `MOLTBOT_BASE_URL`
- `MOLTBOT_TOKEN`

Operational configuration:

- `PORT`
- `DRY_RUN`
- `LMSTUDIO_MODEL`
- `LOCALIZATION_MODEL`
- `DEFAULT_CONNECTOR`
- `DEFAULT_LOCALE`
- `DEFAULT_BRAND_VOICE`
- `DEFAULT_OFFER`
- `SCHEDULER_INTERVAL_SECONDS`
- `MAX_DAILY_BUDGET_DELTA`
- `MAX_OUTREACH_BATCH`
- `MAX_UNSUBSCRIBE_RATE`
- `MIN_ROAS_TO_SCALE_UP`
- `DECISION_COOLDOWN_MINUTES`

## Accepted Brain Inputs

### Outreach Events

Accepted types:

- `sent`
- `open`
- `click`
- `reply`
- `positive_reply`
- `meeting_booked`
- `unsubscribe`
- `bounce`

### Analytics Events

Accepted types:

- `impression`
- `click`
- `conversion`
- `reply`
- `positive_reply`
- `unsubscribe`
- `bounce`
- `spend`
- `revenue`

### Research Records

Required fields:

- `campaignId`
- `targetId`

Recommended fields:

- `company`
- `contactName`
- `title`
- `segment`
- `region`
- `preferredChannel`
- `channels`
- `fitScore`
- `intentScore`
- `recencyScore`
- `metadata.sourceUrl`
- `metadata.evidence`

## Typical Upstream Systems

Research:

- LinkedIn
- TrustRadius
- G2
- CSA Research
- internal enrichment exports

Outreach:

- HubSpot
- Apollo
- Instantly
- Smartlead
- Mailgun
- SendGrid
- LinkedIn outbound exports

Analytics:

- LinkedIn Ads
- Meta Ads
- Google Ads
- HubSpot analytics
- CRM revenue events
- server-side product events
