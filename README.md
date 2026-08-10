# MoA Procurement Tracking System Backend

Express and PostgreSQL API for the Ministry of Agriculture procurement
planning, tracking, and reporting system.

## What this API provides

- Secure credential-based authentication.
- Server-side sessions backed by opaque session cookies.
- Email-based account invitations for Administrator-created users.
- Password creation from single-use invitation links.
- Mandatory temporary-password replacement for the bootstrap Administrator.
- Password-reset token creation and delivery integration.
- Role and session authorization middleware.
- Authentication audit records and account lockout.
- OpenAPI documentation at `/api-docs`.

## Technology

- Node.js and TypeScript
- Express 5
- PostgreSQL 17
- Prisma 7
- Zod validation
- Vitest
- Docker Compose for local services

## Roles

| API value             | Display name        | Provisioning                                     |
| --------------------- | ------------------- | ------------------------------------------------ |
| `OFFICER`             | Officer             | Created by an Administrator                      |
| `DIRECTOR`            | Director            | Created by an Administrator                      |
| `ENDORSING_COMMITTEE` | Endorsing Committee | Created by an Administrator                      |
| `ADMIN`               | Administrator       | Initial account created by the bootstrap command |

The bootstrap command creates only the first Administrator. It stops when an
Administrator already exists.

## Authentication flow

1. An Administrator enters a user's name and email and selects Officer,
   Director, or Endorsing Committee.
2. The backend creates an `INVITED` account with no password and stores only the
   hash of a cryptographically random, single-use invitation token.
3. MailerSend emails the user a link to `/create-password`.
4. The user opens the link and creates a password that satisfies the policy.
5. The backend consumes the invitation token and activates the account.
6. The user signs in and receives an authenticated server-side session.
7. Protected endpoints verify the session, account status, and required role.
8. Signing out revokes the server-side session and clears the browser cookie.

The bootstrap Administrator is the only account that uses a generated
temporary password and the restricted `PASSWORD_CHANGE` session.

## Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose, or a compatible PostgreSQL instance

## Local setup

1. Copy the environment template.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Git Bash, macOS, or Linux:

   ```bash
   cp .env.example .env
   ```

2. Review `.env`. The supplied Docker configuration uses:

   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/procurement?schema=public
   FRONTEND_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3000
   ```

3. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d
   ```

4. Install dependencies:

   ```bash
   npm ci
   ```

5. Apply the committed database migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Create the bootstrap Administrator:

   ```bash
   npm run bootstrap:admin
   ```

   Leave `BOOTSTRAP_ADMIN_PASSWORD` blank to generate a strong one-time
   password. The command prints it once. Store it securely and change it at the
   first sign-in.

7. Start the API:

   ```bash
   npm run dev
   ```

8. Verify the service at <http://localhost:5000>. API documentation is
   available at <http://localhost:5000/api-docs>.

The frontend should set `BACKEND_API_URL=http://localhost:5000`. Browser clients
use the frontend's same-origin authentication proxy.

## Authentication endpoints

| Method | Endpoint                    | Purpose                                   |
| ------ | --------------------------- | ----------------------------------------- |
| `POST` | `/api/auth/login`           | Validate credentials and create a session |
| `GET`  | `/api/auth/session`         | Return the current session and user       |
| `POST` | `/api/auth/change-password` | Replace a temporary or current password   |
| `POST` | `/api/auth/create-password` | Activate an invited account               |
| `POST` | `/api/auth/logout`          | Revoke the current session                |
| `POST` | `/api/auth/forgot-password` | Request password-reset delivery           |
| `POST` | `/api/auth/reset-password`  | Complete a password reset                 |
| `POST` | `/api/admin/users`          | Provision a non-Administrator user        |
| `GET`  | `/api/me`                   | Return the authenticated user             |

`POST /api/admin/users` requires an authenticated Administrator and accepts only
`displayName`, `email`, and a non-Administrator `role`. It sends an invitation
through MailerSend. The API response never exposes the invitation token or a
password.

## Security controls

- Passwords are salted and hashed with `scrypt`.
- Bootstrap temporary passwords and invitation/reset/session tokens use
  cryptographically secure random bytes.
- Only hashes of invitation, session, and password-reset tokens are stored in
  PostgreSQL.
- Session cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` in production.
- Invalid credentials, inactive accounts, locked accounts, and expired temporary
  passwords receive the same generic sign-in error.
- Repeated failed sign-ins trigger a temporary account lock.
- First-login sessions cannot use ordinary protected endpoints.
- Password changes and resets revoke existing sessions.
- Authentication events are written to `AuthAuditLog`.

## User-invitation delivery

Set `MAILERSEND_API_TOKEN`, `MAILERSEND_FROM_EMAIL`, and
`MAILERSEND_FROM_NAME` on the backend. The sender address must belong to a
domain verified in MailerSend. The backend sends the invitation link directly
through MailerSend's transactional email API.

The previous Ministry delivery webhook remains commented in
`src/modules/auth/auth.routes.ts` for a future cutover. Before enabling it,
disable the MailerSend delivery block to prevent duplicate email. The future
webhook payload is:

```json
{
  "to": "user@moa.gov.et",
  "displayName": "Example User",
  "role": "OFFICER",
  "invitationUrl": "https://frontend.example/create-password?token=..."
}
```

In development, the invitation URL is written to the backend log when
MailerSend is not configured. Production requires MailerSend and never returns
or logs the invitation token. If delivery fails, the account is removed so the
Administrator can retry safely.

## Password-reset delivery

Password reset links use the same MailerSend configuration. The previous
Ministry password-reset webhook is also retained as commented code for the
future cutover. Its payload is:

```json
{
  "to": "user@moa.gov.et",
  "resetUrl": "https://frontend.example/reset-password?token=..."
}
```

Reset requests always return the same generic response. In development, the
reset URL is logged when MailerSend is not configured. Production does not
return or log the reset URL and requires a configured delivery service.

## Important environment variables

| Variable                          | Purpose                                           | Local default                    |
| --------------------------------- | ------------------------------------------------- | -------------------------------- |
| `PORT`                            | API port                                          | `5000`                           |
| `DATABASE_URL`                    | PostgreSQL connection string                      | Docker PostgreSQL on port `5433` |
| `FRONTEND_URL`                    | Base URL used in reset links                      | `http://localhost:3000`          |
| `CORS_ORIGIN`                     | Allowed browser origin or comma-separated origins | `http://localhost:3000`          |
| `SESSION_HOURS`                   | Standard session lifetime                         | `8`                              |
| `REMEMBER_SESSION_DAYS`           | Remember-me session lifetime                      | `30`                             |
| `PASSWORD_CHANGE_SESSION_MINUTES` | Restricted first-login session lifetime           | `15`                             |
| `PASSWORD_RESET_MINUTES`          | Password-reset token lifetime                     | `30`                             |
| `USER_INVITATION_HOURS`           | Account-invitation link lifetime                  | `72`                             |
| `TEMP_PASSWORD_HOURS`             | Temporary-password lifetime                       | `72`                             |
| `LOGIN_MAX_ATTEMPTS`              | Failed attempts before account lock               | `5`                              |
| `LOGIN_LOCK_MINUTES`              | Account-lock duration                             | `15`                             |
| `MAILERSEND_API_TOKEN`            | Server-only MailerSend API credential             | Required for email delivery      |
| `MAILERSEND_FROM_EMAIL`           | Sender on a MailerSend-verified domain            | Required for email delivery      |
| `MAILERSEND_FROM_NAME`            | Transactional email sender name                   | Required for email delivery      |
| `PASSWORD_RESET_WEBHOOK_URL`      | Reserved future reset email webhook               | Inactive while commented         |
| `USER_INVITATION_WEBHOOK_URL`     | Reserved future account-invitation webhook        | Inactive while commented         |
| `BOOTSTRAP_ADMIN_EMAIL`           | Initial Administrator email                       | `admin@moa.gov.et`               |
| `BOOTSTRAP_ADMIN_PASSWORD`        | Optional initial one-time password                | Generated when blank             |

## Available commands

| Command                   | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Start the development API with file watching  |
| `npm run build`           | Generate Prisma Client and compile TypeScript |
| `npm start`               | Run the compiled API                          |
| `npm run bootstrap:admin` | Create the first Administrator                |
| `npm run prisma:generate` | Generate Prisma Client                        |
| `npm run prisma:migrate`  | Create/apply a development migration          |
| `npm run format:check`    | Check Prettier formatting                     |
| `npm run format`          | Apply Prettier formatting                     |
| `npm run lint`            | Run ESLint                                    |
| `npm run typecheck`       | Run TypeScript without emitting files         |
| `npm test`                | Run the Vitest test suite                     |

Run the complete verification set before opening a pull request:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npx prisma validate
npm run build
```

## Production checklist

- Replace all local database credentials and URLs.
- Set `NODE_ENV=production` and serve the frontend and backend over HTTPS.
- Configure the three `MAILERSEND_*` variables in the deployment secret
  manager and verify the sender domain before enabling production traffic.
- When the approved Ministry email service is ready, disable MailerSend before
  uncommenting the two webhook delivery blocks.
- Restrict database and API network access.
- Apply migrations with `npx prisma migrate deploy` before starting the API.
- Store environment values in the deployment platform's secret manager.
- Add infrastructure-level request throttling for public authentication routes.
- Back up PostgreSQL and define retention for authentication audit logs.
