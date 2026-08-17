# MoA Procurement Tracking System Backend

Express, PostgreSQL, and Prisma API for the Ministry of Agriculture
procurement tracking system.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and replace the local values.
3. Start PostgreSQL and Redis with `docker compose up -d`.
4. Apply migrations with `npx prisma migrate deploy`.
5. Generate the Prisma client with `npx prisma generate`.
6. Create the initial Administrator with `npm run bootstrap:admin`.
7. Start the API with `npm run dev`.

The Administrator must replace the bootstrap password on first sign-in before
creating other users.

## MailerSend

MailerSend is configured only in the backend. Set all three variables together:

```dotenv
MAILERSEND_API_TOKEN="your-rotated-api-token"
MAILERSEND_FROM_EMAIL="noreply@your-verified-domain.example"
MAILERSEND_FROM_NAME="MoA Procurement Tracking System"
```

The domain used by `MAILERSEND_FROM_EMAIL` must be verified in the same
MailerSend account as the API token. Never commit the token or expose it through
a frontend or `NEXT_PUBLIC_*` variable.

When MailerSend is configured, these flows send email through
`https://api.mailersend.com/v1/email`:

- Administrator account invitations
- Password-reset links

In development, if all three MailerSend variables are empty, links are written
to the backend log. In production, the API refuses to start without a complete
MailerSend configuration.

The commented webhook blocks in the authentication route are reserved for the
future Ministry email server. Keep them commented while MailerSend is active so
messages are not sent twice.

## Verification

```bash
npx prisma validate
npm run typecheck
npm test
npm run lint
npm run build
```
