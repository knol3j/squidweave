# Railway deployment (2-service architecture)

This folder deploys SquidWeave with autonomous Hermes agents on Railway using two services:

1) squidweave-api (web service)
2) hermes-telegram-worker (worker/web service for gateway + Telegram bot)

## Service A: squidweave-api

- Root directory: repository root
- Dockerfile path: deploy/railway/api/Dockerfile
- Public networking: enabled
- Healthcheck path: /health

Environment variables:
- Copy from deploy/railway/api/.env.railway.example
- Set AUTH_TOKEN and keep it secret

## Service B: hermes-telegram-worker

- Root directory: repository root
- Dockerfile path: deploy/railway/worker/Dockerfile
- Public networking: enabled only if using webhook delivery

Environment variables:
- Copy from deploy/railway/worker/.env.railway.example
- SQUIDWEAVE_AUTH_TOKEN must exactly match Service A AUTH_TOKEN
- Set TELEGRAM_BOT_TOKEN

## Internal service URL wiring

Use Railway private networking to connect worker -> API.

Set on worker:
- SQUIDWEAVE_API_BASE_URL=http://<your-api-service-name>.railway.internal:4010

## Telegram webhook

After worker is deployed and has a public URL:

https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<worker-domain>/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>

If you run long polling instead of webhooks, disable webhook and keep only TELEGRAM_BOT_TOKEN.

## Recommended operational settings

- Enable automatic restarts for both services
- Keep API and worker logs separate in Railway
- Use Railway variables/secrets, do not commit real tokens
- Rotate AUTH_TOKEN and bot secrets periodically

## Deploy order

1. Deploy squidweave-api and verify /health
2. Deploy hermes-telegram-worker
3. Set Telegram webhook (or polling mode)
4. Send a test command via Telegram and confirm it can reach SquidWeave API

## Security checklist

- AUTH_TOKEN set on API
- Matching SQUIDWEAVE_AUTH_TOKEN set on worker
- TELEGRAM_WEBHOOK_SECRET set and validated by gateway
- ALLOWED_ORIGINS locked to your front-end domain
- Rate limits enabled on API
