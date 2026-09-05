# PayCore — Project Handover & Milestone Summary

## 1. What Has Been Built

### Foundations & Identity (Milestone 1)
- Scaffolding in Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v3, and Prisma v8.
- Complete domain model in `prisma/schema.prisma` with 25+ models, enums, soft delete columns, and relations.
- PostgreSQL driver adapter (`@prisma/adapter-pg`) in `lib/db.ts` connected to Neon DB.
- Custom credential-based JWT authentication (`bcrypt` + `jose`) with 15m access / 30d refresh tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies.
- RBAC permissions matrix (`lib/auth/permissions.ts`) covering 5 roles: `ADMIN`, `HR_PAYROLL_MANAGER`, `HR_PAYROLL_USER`, `HR_MANAGER`, and `EMPLOYEE`.
- Production security middleware in `middleware.ts` with Content-Security-Policy, HSTS, and X-Frame-Options headers.
- Base UI design system in `components/ui/` (`Avatar`, `StatusPill`, `KpiCard`, `SeverityCard`, `StepTracker`, `Modal`, `Empty`, `ApprovalTimeline`).
- Authenticated App Shell layout (`app/(app)/layout.tsx`) dynamically filtering navigation items by user role.

### Core HR Data (Milestone 2)
- REST APIs & Zod validation schemas for Departments, Job Positions, Working Schedules, Employees, and Contracts.
- AES-256-GCM field-level encryption for sensitive columns (bank account number, IFSC, PAN).
- Auto-code generator for `EMP/YYYY/XXXX` and `CON/YYYY/XXXX`.
- Contract overlap constraint enforced during creation and updates for `RUNNING` status.
- Employees screen (`app/(app)/employees/page.tsx`) with search, department filtering, status filtering, and List/Board (Kanban) view toggles.
- Employee Profile screen (`app/(app)/employees/[employeeId]/page.tsx`) with dynamic smart tiles and 6 live tabs (Overview, Employment/Contracts, Time, Leave, Payroll, Documents).
- Global Contracts directory (`app/(app)/contracts/page.tsx`).
- Working Schedules page with dynamic slot editor and weekly hours auto-calculation.

### Attendance Operations (Milestone 3)
- Attendance APIs: `/api/attendance/check-in`, `/api/attendance/check-out`, `/api/attendance/status`, and paginated list `/api/attendance`.
- Status derivation rules: auto-detects `LATE` when check-in is >15 minutes after schedule slot start.
- Manual attendance correction endpoints requiring mandatory `correctionReason` and writing an `AuditLog`.
- Live Attendance widget with elapsed timer calculated from the server's check-in timestamp.
- Calendar view (grid of weekdays with present ✓ and late ⚠ icons) and Table view.

### Time & Leave Management (Milestone 4)
- Full CRUD for Leave Types and Allocations.
- Time Off Request submission and approval workflow with atomic balance validation (`remainingAmount >= durationAmount`).
- Symmetrical balance reversal on refused or cancelled requests.
- Leave requests screen (`app/(app)/time-off/requests/page.tsx`) with detail modal, `ApprovalTimeline`, balance deduction bar, and approve/refuse actions.
- Allocations overview page (`app/(app)/time-off/allocations/page.tsx`) with visual percentage usage bars.

### Payroll Configuration & Formula Sandbox (Milestone 5)
- Salary Structures and Salary Rules CRUD APIs.
- Sandboxed recursive descent formula parser and evaluator (`lib/payroll/evaluator.ts`) avoiding `eval()` and `new Function()`.
- Formula dry-run validator (`/api/payroll/rules/validate-formula`).
- Salary Rules configuration screen (`app/(app)/payroll/rules/page.tsx`) with method switching (Fixed, Percentage, Formula) and live test button.
- Salary Structures screen (`app/(app)/payroll/structures/page.tsx`).

### Payroll Engine & Payruns (Milestone 6)
- Pure framework-agnostic payroll calculation engine (`lib/payroll/engine.ts`).
- Two-step wizard creation rule:
  - Step 1: `/api/payroll/payruns/draft-scope` resolves eligible active employees with running contracts without database write.
  - Step 2: `/api/payroll/payruns` atomically creates Payrun and draft payslips.
- Pipeline state machine: `DRAFT -> COMPUTED -> VALIDATED -> PAID`.
- Automated warning detection: `MISSING_BANK_DETAILS`, `DUPLICATE_PAYSLIP`, `NEGATIVE_NET_PAY`, `MISSING_WORKING_SCHEDULE`.
- Blocking warnings guard preventing marking a payrun paid if unresolved blockers exist.
- Payroll Runs page (`app/(app)/payroll/payruns/page.tsx`) with 12-month strip, `StepTracker`, severity cards, and action buttons.
- Payslips directory (`app/(app)/payroll/payslips/page.tsx`) with interactive payslip breakdown modal.

### Insights & Dashboard (Milestone 8)
- Aggregated metrics endpoint (`/api/dashboard`) returning live KPIs, trend series, department distribution, and audit activity.
- Overview page (`app/(app)/overview/page.tsx`) with real greeting, attention cards, KPI metrics, progress card, and recent audit activity.
- Payroll Dashboard (`app/(app)/dashboard/page.tsx`) with Recharts `AreaChart` (gradient fill) and `BarChart` (rounded radii).

### Employee Self-Service Portal (Milestone 9)
- Dedicated Portal shell (`app/(portal)/layout.tsx` and `app/(portal)/page.tsx`).
- Sub-views for `My Home`, `My Profile`, `My Attendance`, `My Leave`, `My Payslips`, and `My Documents`.
- Live check-in/out integration and leave balance tracking.

---

## 2. Out of Scope for v1 (Documented per Spec Section 18)
The following were intentionally deferred to keep v1 stable and shippable:
- Multi-company / multi-tenant billing & org-switching (data model has `companyId` prepared for v2).
- Third-party social SSO (credential authentication only in v1).
- Country-specific statutory tax slabs hardcoded into the app (represented through the configurable Salary Rule engine).
- Native mobile apps (responsive web design implemented throughout).
- Multi-currency payroll (single company currency `INR` for v1).

---

## 3. Seed Credentials (Development)
- **Admin**: `darshan@paycore.in` / `password`
- **Employee**: `aarav.mehta@paycore.in` / `password`
