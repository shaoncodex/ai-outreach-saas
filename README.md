# LeadPilot AI

AI-assisted B2B lead research, compliant outreach, follow-up automation and inbox intelligence powered by Hostinger Mail API.

## Included in this MVP
- Premium responsive SaaS dashboard
- Agent Command Center
- Hostinger Mail SDK send wrapper (`@hostinger/mail-sdk`)
- Hostinger `message.received` webhook endpoint
- AI reply-intent classification with demo fallback
- Telegram hot-lead notifications
- REST API secured with `x-api-key`
- MCP server for OpenClaw / OpenAI / Claude-compatible clients
- PostgreSQL + Prisma multi-tenant-ready data model
- BullMQ / Redis follow-up queue adapter
- Suppression/reply-stop/daily-limit policy layer
- Demo lead and campaign endpoints
- Docker Compose for PostgreSQL + Redis

## Quick start
```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma generate
npx prisma db push
npm run dev
```
Open http://localhost:3000

## Connect Hostinger
Create a Hostinger Mail API token in hPanel and set:
```env
HOSTINGER_MAIL_TOKEN=...
HOSTINGER_MAILBOX_RESOURCE_ID=AC...
```
Then test:
```bash
curl -X POST http://localhost:3000/api/mail/send \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_AGENT_API_KEY' \
  -d '{"to":"you@example.com","subject":"LeadPilot test","text":"Hello from LeadPilot"}'
```

## Hostinger webhook
Expose the app over HTTPS and create a Hostinger webhook for `message.received` pointing to:
```text
https://YOUR-DOMAIN/api/webhooks/hostinger
```
Store the generated webhook secret in `HOSTINGER_WEBHOOK_SECRET`. Hostinger sends the secret as a Bearer token on webhook deliveries.

## Connect OpenAI / OpenClaw
### REST
Give the agent `APP_URL` and `AGENT_API_KEY`. Start with:
- `POST /api/agent/command`
- `GET /api/leads`
- `POST /api/mail/send`

### MCP
Run:
```bash
npm run mcp
```
Example client config:
```json
{
  "mcpServers": {
    "leadpilot": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/leadpilot-ai",
      "env": {
        "APP_URL": "http://localhost:3000",
        "AGENT_API_KEY": "your-key"
      }
    }
  }
}
```

## Production hardening checklist
1. Add Auth.js/Better Auth and workspace membership authorization.
2. Encrypt provider tokens at rest; do not keep mailbox tokens as plain DB columns.
3. Replace demo lead endpoints with Prisma-backed CRUD.
4. Add a worker process for BullMQ follow-ups and re-check policy immediately before every send.
5. Validate Hostinger webhook event schema against your live payload and persist raw event IDs for idempotency.
6. Add jurisdiction-aware outreach rules, unsubscribe links, physical-business identity/footer where required, suppression and bounce processing.
7. Add source adapters that use official/publicly permitted data sources and respect site terms/robots/access controls.
8. Add per-mailbox warm-up/rate limits and deliverability monitoring.
9. Add audit logs for every agent tool call and outbound send.
10. Add explicit approval gates before enabling full Autopilot mode.

## Architecture
```text
AI / OpenClaw / OpenAI
        |
     REST + MCP
        |
 Policy & Permission Layer
   /        |        \
Research    CRM      Mail
                    |
              Hostinger API
                    |
         message.received webhook
                    |
             AI reply classifier
                    |
              Telegram alert
```

## Important
This project is designed for legitimate B2B prospecting. Do not use it to bypass access controls, harvest private/sensitive information, ignore opt-outs, or send deceptive/spam messages. Public availability of a contact address does not by itself remove applicable marketing/privacy obligations.

## Dashboard-managed local secrets
Open **Settings** or **Integrations** in the dashboard to configure Hostinger Mail, OpenAI, Telegram and Agent API credentials. Values are persisted on the server in `data/settings.enc.json` and encrypted with AES-256-GCM using a locally generated key in `data/.settings-key`. Secret values are never returned to the dashboard after saving. Runtime integrations read the local setting first and fall back to matching environment variables when no local value exists.

Back up both files together if you need to migrate the installation. Do not commit either file; both are ignored by Git.
