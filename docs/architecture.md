# PayCore — Architecture & Technical Design

## 1. System Overview
PayCore is a single full-stack Next.js 15 (App Router) SaaS application backed by PostgreSQL (hosted on Neon) and Upstash Redis. Route Handlers under `app/api/**` serve as the backend.

```
paycore/
├── app/
│   ├── (auth)/login/             # Public authentication
│   ├── (app)/                    # Authenticated staff app shell
│   │   ├── overview/             # Operational overview & KPIs
│   │   ├── employees/            # List & Kanban, [employeeId] profile
│   │   ├── contracts/            # Global contracts management
│   │   ├── working-schedules/    # Working schedules & slot editor
│   │   ├── attendance/           # Live check-in widget, calendar & table
│   │   ├── time-off/             # requests, allocations, types
│   │   ├── payroll/              # payruns, payslips, structures, rules
│   │   └── dashboard/            # Payroll cost trends & department distribution
│   ├── (portal)/                 # Employee Self-Service Portal
│   ├── api/                      # 30+ typed REST route handlers
│   ├── globals.css               # Design tokens & utility classes
│   └── layout.tsx
├── components/ui/                # Design system primitives (Avatar, StatusPill, KpiCard, Modal)
├── features/                     # Feature modules (employees, payroll, attendance, etc.)
├── lib/
│   ├── db.ts                     # Prisma v8 client singleton with Neon driver adapter
│   ├── auth/                     # JWT session, RBAC, password hashing, rate limiting
│   ├── payroll/                  # Pure payroll engine & sandboxed formula evaluator
│   ├── security/                 # AES-256-GCM field level encryption
│   └── validation/               # Zod validation schemas
├── prisma/
│   ├── schema.prisma             # Full domain model (25+ tables)
│   └── seed.ts                   # Master data & demo seed script
└── docs/                         # Runbook, API docs, Decisions, Architecture
```

---

## 2. Core Design Principles

### 2.1 Pure Business Logic Separation
All financial computations (payroll rule processing, proration, net salary calculation) and balance accounting (leave balance drawdown and symmetric reversal) are implemented as **pure, framework-agnostic TypeScript functions** in `lib/payroll/*`. Route handlers only fetch data, pass it to pure functions, and persist results within transactions.

### 2.2 Invariant Integrity & Transactions
- **Contract Overlap Guard**: An employee cannot have overlapping date ranges while both contracts are in `RUNNING` status.
- **Leave Balance Gate**: Approving a time-off request requires an atomic verification that `remainingAmount >= durationAmount`. Approved leave increments `takenAmount`; refusals or cancellations reverse the balance symmetrically.
- **Payrun State Progression**: Transitions follow `DRAFT -> COMPUTED -> VALIDATED -> PAID`. Marking paid is blocked if unresolved blocking warnings exist (missing bank details or negative net pay).

---

## 3. Security Architecture

### 3.1 Field-Level Encryption
Bank account numbers, IFSC codes, and PAN numbers are encrypted at rest using **AES-256-GCM** via `lib/security/crypto.ts`. Data in the database is stored as `iv:authTag:ciphertext`. Masking (`••••••••4812`) is applied for standard UI displays.

### 3.2 Authentication & RBAC
- Passwords hashed with `bcrypt` (12 rounds).
- Short-lived JWT access tokens (15m) + long-lived refresh tokens (30d) stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies.
- Declarative permissions matrix enforced server-side via `requirePermission(role, resource, action)`.
- Security headers configured in Next.js middleware (CSP, X-Frame-Options, HSTS, nosniff).

---

## 4. Formula Sandbox
Salary rules supporting the `FORMULA` computation method are parsed through a sandboxed recursive descent evaluator (`lib/payroll/evaluator.ts`). Expressions are tokenized and evaluated strictly against allowed context variables (`WORKED_DAYS`, `TOTAL_WORKING_DAYS`, `UNPAID_LEAVE_DAYS`, `CONTRACT_WAGE`) and previously computed rule codes. Neither `eval()` nor `new Function()` is ever invoked.
