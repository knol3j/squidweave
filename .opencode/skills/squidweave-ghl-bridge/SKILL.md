# SquidWeave GoHighLevel Bridge

Integration with GoHighLevel (GHL) API via `GhlBridge` class at `src/integrations/ghl-bridge.mjs`.

## Core Methods

- **`verifyWebhookSignature(signature, rawBody)`** — HMAC-SHA256 verification using shared secret from `config.GHL_WEBHOOK_SECRET`. Returns boolean.
- **`upsertContact({ email, name, phone, ... })`** — Looks up by email, creates or updates contact. Returns contact object with `{ id, email, name, ... }`.
- **`addNote(contactId, note)`** — Appends internal note to GHL contact profile.
- **`getCampaigns()`** — Lists active GHL campaigns/opportunities pipeline. Returns array of `{ id, name, status, ... }`.
- **`createOpportunity({ contactId, campaignId, stage, ... })`** — Creates opportunity in GHL pipeline.
- **`updateOpportunity(opportunityId, updates)`** — Updates pipeline stage, status, etc.
- **`getPipelines()`** — Lists all pipelines with stages.

## Webhook Handling

GHL sends webhooks from form submissions, calendar events, opportunity stage changes. The bridge:
1. Receives raw body + `x-webhook-signature` header
2. Verifies with `verifyWebhookSignature()`
3. Parses type from `body.type` or `body.event`
4. Dispatches to appropriate internal handler

## Configuration

Expects environment or config:
- `GHL_API_KEY` — API key for GHL REST API
- `GHL_WEBHOOK_SECRET` — shared secret for HMAC verification
- `GHL_BASE_URL` — defaults to `https://rest.gohighlevel.com/v1/`

## Usage Context

The bridge is used in two directions:
1. **Outbound**: After campaigns execute, results sync to GHL as opportunities/notes
2. **Inbound**: GHL webhooks (form fills, lead creation) trigger SquidWeave campaign actions
