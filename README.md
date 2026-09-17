# LeadPilot AI

Database-backed outreach and follow-up automation for Hostinger Mail. It imports permission-confirmed contacts, sends a controlled number of personalized emails, stops follow-ups on any reply, classifies intent and alerts Telegram.

## What is working

- CSV contact import with header aliases, validation and duplicate protection
- Mandatory permission-source confirmation before a contact becomes send-eligible
- Campaign builder with initial email plus follow-up steps
- `{{firstName}}`, `{{fullName}}`, `{{company}}`, `{{role}}`, `{{website}}` and `{{location}}` variables
- Default limit of 10 emails per campaign/mailbox per rolling 24 hours
- Weekday and local-time send window (default: 09:00–17:00 Asia/Dhaka)
- Dry Run enabled on every new campaign
- Real Hostinger Mail sending only after Live mode is explicitly enabled
- Automatic reply-stop, unsubscribe and bounce suppression
- Idempotent Hostinger inbound webhook processing
- Telegram notification for every reply
- PostgreSQL/Prisma persistence and a standalone worker
- Encrypted local integration settings
- REST and MCP access for agents

## Safe operating flow

1. Create a campaign. It starts in `DRAFT` and `Dry Run` mode.
2. Import a CSV and confirm the lawful/permission source.
3. Enroll eligible contacts in the campaign.
4. Activate the campaign.
5. Preview three generated emails. Nothing is sent during preview.
6. Configure Hostinger Mail and Telegram, then send tests.
7. Explicitly disable Dry Run only after reviewing the preview.
8. Run the worker or call the protected cron endpoint.

Any inbound reply stops all pending follow-ups for the matched contact. `UNSUBSCRIBE` and `BOUNCE` replies also add the address to the suppression list.

## Local setup

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000` and configure integrations under **Settings**.

## Required configuration

```env
DATABASE_URL=postgresql://leadpilot:leadpilot@localhost:5432/leadpilot?schema=public
HOSTINGER_MAIL_TOKEN=
HOSTINGER_MAILBOX_RESOURCE_ID=
HOSTINGER_FROM_ADDRESS=hello@shaonrahman.com
HOSTINGER_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
AGENT_API_KEY=
OUTREACH_CRON_SECRET=
```

Credentials may instead be added from the dashboard. They are encrypted into `data/settings.enc.json` with a separate local key in `data/.settings-key`; both files are ignored by Git.

## Run scheduling

### Long-running worker

```bash
npm run worker
```

It checks due campaigns every 30 minutes and sends at most one due message per campaign on each pass, while enforcing the shared mailbox daily cap. Change the interval with `OUTREACH_WORKER_INTERVAL_MS` (minimum 60 seconds).

### Hostinger cron or n8n

Call:

```http
POST /api/automation/run
Authorization: Bearer YOUR_OUTREACH_CRON_SECRET
Content-Type: application/json

{}
```

The endpoint re-checks campaign status, contact permission, suppression, prior replies, send window and daily limit immediately before sending.

## Hostinger webhook

Create a Hostinger `message.received` webhook pointing to:

```text
https://YOUR-DOMAIN/api/webhooks/hostinger
```

Save its Bearer secret as `HOSTINGER_WEBHOOK_SECRET`. The handler records each provider event once, matches the sender to a contact, stops pending follow-ups, updates lead status and sends the Telegram alert.

## CSV format

```csv
first_name,last_name,email,company,role,website,location
Jane,Doe,jane@example.com,Doe Realty,Agent,https://example.com,Miami
```

Common alternatives such as `name`, `full_name`, `email_address`, `business`, `job_title`, `url`, `city` and `country` are recognized.

## Verification

```bash
npm test
npm run build
```

## Compliance

Use only legitimate customer or permission-based prospect lists. Do not upload purchased, scraped, private or Fiverr customer addresses for off-platform promotion without appropriate consent. Every generated plain-text message includes a reply-based opt-out instruction; providers and jurisdictions may require additional identity, postal-address or one-click unsubscribe controls.
