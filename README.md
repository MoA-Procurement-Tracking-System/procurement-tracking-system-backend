# MoA Procurement Tracking System — Backend API

RESTful API backend for the Ministry of Agriculture Procurement Tracking System, built with **Node.js (ES Modules)**, **Express 5**, **Prisma 7**, and **PostgreSQL**.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+ or v24, ESM `"type": "module"`)
- **Framework**: Express 5.2.1
- **Database & ORM**: PostgreSQL (`pg` 8.23) with Prisma 7.9 (`@prisma/adapter-pg`)
- **Language**: TypeScript 5.7
- **Authentication**: JWT (`jsonwebtoken`), bcryptjs, and HttpOnly session cookies
- **Security**: Helmet, Express Rate Limit, CORS
- **Logging**: Pino 10, Pino-HTTP, and Pino-Pretty
- **Interactive Documentation**: Swagger UI (`swagger-ui-express`, `swagger-jsdoc`)
- **Scheduled Cron Jobs**: `node-cron`
- **Email Service**: Nodemailer (SMTP)
- **Validation**: Zod
- **Testing**: Vitest 4

---

## 💡 Architecture & Key Features

1. **Prisma 7 Multi-File Schema**:
   - Database models are modularized in `prisma/*.prisma` (`user.prisma`, `plan.prisma`, `activity.prisma`, `contract.prisma`, `audit.prisma`, `lookup.prisma`, etc.).
   - Utilizes Prisma's modern PostgreSQL adapter for high-performance pooling.

2. **Automated Cron Jobs (`node-cron`)**:
   - **Committee Reminder Job**: Regularly scans for pending committee review items and notifies endorsing committee members.
   - **Backup Job**: Automated database backup scheduler (configurable for production servers via `BACKUP_ENABLED=true`).

3. **Interactive Swagger Documentation**:
   - Live OpenAPI specification automatically mounted at `/api-docs`.

4. **Audit Logging & Revision Tracking**:
   - Built-in audit logger intercepts critical mutations and persists user ID, entity type, action, and JSON change diffs.

5. **Bootstrap Admin Auto-Provisioning**:
   - Automatically initializes the system administrator upon server startup using `BOOTSTRAP_ADMIN_EMAIL`.

---

## 📂 Directory Structure

```text
backend/
├── prisma/
│   ├── schema.prisma         # Main Prisma configuration
│   ├── migrations/           # SQL migration history
│   └── *.prisma              # Modular model files (user, plan, contract, activity, etc.)
├── src/
│   ├── config/               # Database client, logger, swagger, and environment parser
│   ├── jobs/                 # Cron jobs (backup.job.ts, committee-reminder.job.ts)
│   ├── modules/              # Domain modules:
│   │   ├── auth/             # Login, invitation tokens, password change, JWT
│   │   ├── users/            # User CRUD and status management
│   │   ├── plans/            # Procurement plans, stages, and committee voting
│   │   ├── projects/         # Project records and officer assignments
│   │   ├── activities/       # Procurement activity tracker and milestone stages
│   │   ├── contracts/        # Contract details, VAT, and milestone disbursements
│   │   ├── suppliers/        # Vendor and supplier registry
│   │   ├── reports/          # Streaming Excel report generators (.xlsx)
│   │   ├── excel/            # Excel template downloads and project batch import
│   │   ├── lookups/          # Methods, funding sources, and category tables
│   │   ├── alerts/           # Notification alerts
│   │   ├── documents/        # Document attachment metadata
│   │   ├── dashboard/        # Role dashboard summary metrics
│   │   └── audit-logs/       # System audit logs viewer
│   ├── services/             # Nodemailer email service
│   ├── shared/               # Shared audit loggers and Prisma singletons
│   ├── utils/                # JWT helpers, password hashing, and error classes
│   ├── seed_committee_demo.ts# Demo dataset seeding script
│   ├── app.ts                # Express application configuration & route mounting
│   └── server.ts             # Server entry point, shutdown handlers & cron registration
├── .env.example              # Environment variable template
├── package.json              # Scripts and dependencies
└── tsconfig.json             # TypeScript configuration
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Key environment configurations:

```dotenv
NODE_ENV=development
PORT=5000

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procurement_tracking?schema=public"

# Frontend URL & CORS
FRONTEND_URL="http://localhost:3200"
CORS_ORIGIN="http://localhost:3200,http://localhost:3000"

# Rate Limiting & Logging
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info

# Session & Token Settings
SESSION_COOKIE_NAME="moa_session"
SESSION_HOURS=8
REMEMBER_SESSION_DAYS=30
PASSWORD_CHANGE_SESSION_MINUTES=15
PASSWORD_RESET_MINUTES=30
USER_INVITATION_HOURS=72
TEMP_PASSWORD_HOURS=72
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# SMTP Email Settings (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM='"MoA Procurement Tracking System" <your-email@gmail.com>'

# Initial System Administrator
BOOTSTRAP_ADMIN_EMAIL="admin@moa.gov.et"
BOOTSTRAP_ADMIN_NAME="System Administrator"
BOOTSTRAP_ADMIN_PASSWORD="" # Leave blank to auto-generate password on startup

# Automated Server Backup
BACKUP_ENABLED=false
BACKUP_REMOTE_PATH=""
```

---

## 🗄️ Database & Prisma Setup

1. **Generate Prisma Client**:

   ```bash
   npm run prisma:generate
   ```

2. **Apply Migrations**:

   ```bash
   npm run prisma:migrate
   ```

3. **Seed Demo Accounts & Data**:
   ```bash
   npx tsx src/seed_committee_demo.ts
   ```

---

## 🚦 Available Scripts

Run from the `backend/` directory:

| Command                   | Description                                                  |
| :------------------------ | :----------------------------------------------------------- |
| `npm run dev`             | Start development server with Nodemon and `tsx` on Port 5000 |
| `npm run build`           | Compile TypeScript (`tsc`) to `dist/`                        |
| `npm run clean`           | Remove `dist/` directory                                     |
| `npm start`               | Run compiled production server (`node dist/server.js`)       |
| `npm run prisma:generate` | Regenerate Prisma Client from schemas                        |
| `npm run prisma:migrate`  | Run database migrations in development                       |
| `npm run typecheck`       | Run TypeScript check without emitting files (`tsc --noEmit`) |
| `npm run lint`            | Run ESLint on `src/`                                         |
| `npm run format`          | Format code with Prettier                                    |
| `npm test`                | Run test suite with Vitest                                   |

---

## 📡 Key API Routes

- **API Documentation**: `GET /api-docs` (Swagger UI)
- **Health Check**: `GET /api/health`
- **Authentication**: `/api/auth` (`/login`, `/logout`, `/me`, `/forgot-password`, `/reset-password`, `/change-password`)
- **User Management**: `/api/admin` and `/api/users`
- **Procurement Plans**: `/api/plans` (submission, stages, committee votes)
- **Projects**: `/api/projects`
- **Activities**: `/api/activities` (stage progress tracking)
- **Contracts**: `/api/contracts` (awards, payments, amendments)
- **Suppliers**: `/api/suppliers`
- **Excel Tools**: `/api/excel` (project batch import and templates)
- **Reports**: `/api/reports` (streaming `.xlsx` exports)
- **Audit Logs**: `/api/audit-logs`
