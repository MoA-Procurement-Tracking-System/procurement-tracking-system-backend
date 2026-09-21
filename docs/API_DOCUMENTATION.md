# Ministry of Agriculture — Procurement Tracking System (PTS) API Reference

> **Base URL**: `/api`  
> **Interactive Swagger UI**: `http://localhost:5000/api-docs`  
> **OpenAPI Version**: 3.0.0

---

## 1. Authentication & Security

The PTS API supports dual authentication mechanisms:

1. **HTTP-only Session Cookie** (`pts_session`): Used by web browsers. Set automatically upon login.
2. **Bearer Authorization Header** (`Authorization: Bearer <token>`): Used for programmatic access or mobile/API clients.

### Role Authorization Matrix

| Role Key                           | System Role Name           | Permissions Scope                                                 |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `ADMIN` / `Administrator`          | System Administrator       | Full access: user creation, system config, lookup management      |
| `DIRECTOR` / `ProcurementDirector` | Procurement Director       | Approvals, committee dispatch, reports, all contracts             |
| `OFFICER` / `ProcurementOfficer`   | Procurement Officer        | Draft plans, create activities, contracts, request plan revisions |
| `ENDORSING_COMMITTEE`              | Endorsing Committee Member | View submitted plans, cast voting decisions (`APPROVE`/`REJECT`)  |
| `MANAGEMENT` / `ManagementTeam`    | Management Team            | Oversight, analytics, reports                                     |

---

## 2. Core Modules & Endpoints

### System & Health

- `GET /` — Root service information & environment check.
- `GET /api/health` — Operational health status and server timestamp.
- `GET /api-docs` — Swagger UI interactive playground.

---

### Authentication (`/api/auth`, `/api/admin`, `/api`)

- `POST /api/auth/login` — Sign in with identifier (`email` or `username`) and `password`. Returns session token & sets cookie.
- `GET /api/auth/session` — Fetch active session details & current user.
- `POST /api/auth/change-password` — Change password for authenticated session.
- `POST /api/auth/logout` — Revoke session and clear session cookie.
- `POST /api/auth/forgot-password` — Dispatch password reset link to user's registered email.
- `POST /api/auth/create-password` — Set password and activate account using invitation token.
- `POST /api/auth/reset-password` — Reset account password using reset token.
- `POST /api/admin/users` — _(Admin only)_ Invite a new user by email and assign system role.
- `GET /api/me` — Retrieve the currently authenticated user's profile and permissions.

---

### Users (`/api/users`)

- `GET /api/users` — _(Admin, Director)_ List users with pagination (`page`, `pageSize`, `search`, `role`, `isActive`).
- `GET /api/users/:id` — _(Admin, Director)_ Fetch user details by ID.
- `POST /api/users` — _(Admin only)_ Directly create a user account.
- `PATCH /api/users/:id` — _(Admin only)_ Update user name, email, role, or active status.

---

### Projects (`/api/projects`)

- `GET /api/projects` — List active procurement projects.
- `GET /api/projects/:id` — Get comprehensive project details by ID.
- `POST /api/projects` — _(Admin, ProjectManager)_ Create a new project.
- `PATCH /api/projects/:id` — _(Admin, ProjectManager)_ Update project attributes or status (`ACTIVE`, `CLOSED`, `SUSPENDED`).
- `POST /api/projects/:id/officers` — _(Admin, ProjectManager)_ Assign a procurement officer to a project.
- `DELETE /api/projects/:id/officers/:officerId` — _(Admin, ProjectManager)_ Remove assigned officer from a project.

---

### Procurement Plans (`/api/plans`)

- `GET /api/plans` — List procurement plans.
- `GET /api/plans/:id` — Get plan details by ID with associated activities.
- `POST /api/plans` — _(Officer, Director, Admin)_ Create a draft procurement plan.
- `PATCH /api/plans/:id` — Update plan attributes.
- `POST /api/plans/:id/request-update` — _(Officer)_ Request permission to modify an approved plan.
- `POST /api/plans/:id/approve-update` — _(Director, Admin)_ Approve plan modification request.
- `POST /api/plans/:id/submit` — _(Officer)_ Submit draft plan for Director review.
- `POST /api/plans/:id/send-to-committee` — _(Director)_ Dispatch plan to Endorsement Committee with optional voting deadline.
- `POST /api/plans/:id/reject` — _(Director)_ Reject plan with mandatory feedback reason.
- `POST /api/plans/:id/vote` — _(Endorsing Committee)_ Submit formal vote (`APPROVE` or `REJECT`) with commentary.

---

### Activities & Milestones (`/api/activities`)

- `GET /api/activities` — List procurement activities (supports `?planId=` filter).
- `GET /api/activities/:id` — Get procurement activity and roadmap stages.
- `POST /api/activities` — Create new procurement activity with funding sources.
- `PATCH /api/activities/:id` — Update activity specifications, budget, or methods.
- `PATCH /api/activities/:id/stages/:stageId` — Update roadmap stage planned timeline.
- `PATCH /api/activities/:id/stages/:stageId/actual` — Record actual stage start and completion dates.
- `POST /api/activities/:id/stages/:stageId/replan` — Replan stage with revised timeline and reason (generates revision history).

---

### Contracts & Payments (`/api/contracts`)

- `GET /api/contracts` — Query contracts with search and status filters (`ACTIVE`, `COMPLETED`, `CANCELLED`, `PENDING`).
- `POST /api/contracts` — _(Officer, Director, Admin)_ Register a new contract.
- `GET /api/contracts/:id` — Get contract details, supplier metadata, and payment records.
- `PATCH /api/contracts/:id` — _(Officer, Director, Admin)_ Update contract or soft-delete.
- `GET /api/contracts/:id/payments` — Get payment disbursements for a contract.
- `POST /api/contracts/:id/payments` — _(Officer, Director, Admin)_ Record disbursement with mandatory `idempotencyKey`.

---

### Suppliers (`/api/suppliers`)

- `GET /api/suppliers` — Paginated list of registered suppliers with TIN or name search.
- `POST /api/suppliers` — Register a new supplier.

---

### Dashboard Analytics (`/api/dashboard`)

- `GET /api/dashboard/summary` — High-level financial KPIs, active contracts count, disbursement totals.
- `GET /api/dashboard/by-sector` — Sector-based funding allocations and breakdown.

---

### Alerts & Notifications (`/api/alerts`)

- `GET /api/alerts` — Fetch notification alerts for authenticated user/role (`?unreadOnly=true`).
- `POST /api/alerts` — Broadcast a system or targeted alert.
- `PATCH /api/alerts/read-all` — Mark all alerts as read for current user.
- `GET /api/alerts/:id` — Get single alert details.
- `PATCH /api/alerts/:id` — Update alert content or read timestamp.
- `PATCH /api/alerts/:id/read` — Mark single alert as read.
- `DELETE /api/alerts/:id` — Dismiss/delete alert.

---

### Reports (`/api/reports`)

_(All report endpoints generate formatted Excel `.xlsx` spreadsheets)_

- `GET /api/reports/detailed-procurement` — Report #7: Comprehensive Procurement Detail.
- `GET /api/reports/annual-procurement-plan` — Report #1: Annual Procurement Plan Summary.
- `GET /api/reports/procurement-steps` — Report #3: World Bank STEP Format Report.
- `GET /api/reports/plan-vs-actual` — Report #2: Planned vs Actual Timelines Comparison.
- `GET /api/reports/delayed-procurement` — Report #4: Delays, Bottlenecks, and Aging Report.
- `GET /api/reports/contract-payment` — _(Director only)_ Report #6: Contract & Payment Audit.
- `GET /api/reports/monthly-summary` — _(Director only)_ Report #5: Monthly Executive Summary.
- `GET /api/reports/project-officer-summary` — _(Director only)_ Report #8: Officer Performance Summary.
- `GET /api/reports/activity-milestone` — Report #9: Activity Stage Milestone Matrix.
- `POST /api/reports/import/contracts` — Import contracts spreadsheet file.

---

### Excel Templates & Bulk Importers (`/api/excel`)

- `GET /api/excel/templates/projects` — Download Projects blank template (.xlsx).
- `GET /api/excel/templates/plans` — Download Plans blank template (.xlsx).
- `GET /api/excel/templates/activities` — Download Activities blank template (.xlsx).
- `GET /api/excel/templates/contracts` — Download Contracts blank template (.xlsx).
- `GET /api/excel/templates/suppliers` — Download Suppliers blank template (.xlsx).
- `POST /api/excel/import/projects` — Multipart file upload to bulk import projects.
- `POST /api/excel/import/plans` — Multipart file upload to bulk import plans.
- `POST /api/excel/import/activities` — Multipart file upload to bulk import activities.
- `POST /api/excel/import/contracts` — Multipart file upload to bulk import contracts.
- `POST /api/excel/import/suppliers` — Multipart file upload to bulk import suppliers.

---

### Documents (`/api/documents`)

- `POST /api/documents` — Multipart file upload (supports PDF, DOCX, XLSX, PNG, JPEG up to 20MB).
- `GET /api/documents?entityType=...&entityId=...` — Retrieve documents attached to an entity.
- `GET /api/documents/:id/download` — Stream / download attachment file.

---

### Lookups (`/api/lookups`)

- `GET /api/lookups?type=...` — Query lookup dictionary items (procurement methods, sectors, currencies).
- `GET /api/lookups/:id` — Get lookup item by ID.
- `POST /api/lookups` — _(Admin only)_ Create new lookup entry.
- `PATCH /api/lookups/:id` — _(Admin only)_ Update lookup entry label or active status.

---

### Audit Logs (`/api/audit-logs`)

- `GET /api/audit-logs` — _(Admin only)_ Paginated audit trail query (`page`, `pageSize`, `userId`, `entityType`, `action`).
