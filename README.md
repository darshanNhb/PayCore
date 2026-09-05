<div align="center">
  <img src="https://via.placeholder.com/120x120/4338CA/ffffff?text=PayCore" alt="PayCore Logo" width="120" />
  <h1>PayCore</h1>
  <p><em>The calm operating system for people and pay.</em></p>
</div>

---

PayCore is a comprehensive, modern HR and Payroll Management System designed to simplify the complexities of running a business. Built with a sleek, premium interface and powerful backend automation, PayCore handles everything from employee onboarding and attendance tracking to automated payroll processing and payslip generation.

## 📋 Table of Contents
- [✨ Core Features](#-core-features)
- [🏢 Module Deep Dive](#-module-deep-dive)
  - [1. Employee Directory](#1-employee-directory)
  - [2. Automated Payroll Engine](#2-automated-payroll-engine)
  - [3. Time & Attendance](#3-time--attendance)
  - [4. Role-Based Access Control](#4-role-based-access-control-rbac)
- [🏗️ Technical Architecture](#-technical-architecture)
- [🚀 Tech Stack](#-tech-stack)
- [💻 Development Setup](#-development-setup)
- [🔒 Default Credentials](#-default-credentials)
- [📄 License](#-license)

---

## ✨ Core Features

- **Automated Payroll**: Run batch payrolls with one click, automatically adjusting for leave, attendance, and dynamic salary rules.
- **Smart Onboarding**: Employee profiles are automatically provisioned with secure portal access upon creation.
- **Self-Service Portal**: Employees can check in/out, download payslips, and request leave without accessing the administrative UI.
- **Real-Time Analytics**: Dashboard KPIs reflecting real-time headcount, payroll expenses, and system alerts.
- **Audit Logging**: Comprehensive, immutable tracking of sensitive actions (e.g., creating employees, updating contracts, computing payruns).
- **Light/Dark Mode**: Built-in CSS variable design system seamlessly adapting to system preferences.

---

## 🏢 Module Deep Dive

### 1. Employee Directory
The Employee module is the central source of truth for your workforce.
*   **Lifecycle Management**: Tracks an employee from `ACTIVE` to `ON_LEAVE` or `TERMINATED`.
*   **Contract Management**: Handles multiple contracts per employee (Draft, Running, Expired) with detailed compensation breakdowns (Wage, Allowances, Deductions).
*   **Organization Chart**: Tracks Reporting Managers and hierarchical structures.
*   **Bank & Statutory**: Securely encrypts and stores sensitive details like Bank Account numbers, IFSC codes, and PAN details.

### 2. Automated Payroll Engine
PayCore completely automates the traditional payroll workflow:
*   **Salary Structures**: Define parent structures (e.g., "Standard Indian Payroll") that apply to groups of employees.
*   **Dynamic Salary Rules**: Define custom formulas (e.g., `Basic = Wage * 0.5`, `HRA = Basic * 0.4`) and map them to structures.
*   **Batch Payruns**: Generate a Payrun for a specific period (e.g., Sept 2026). The system automatically fetches all `RUNNING` contracts, calculates rules, deducts unpaid leave, and generates draft payslips.
*   **PDF Generation**: Instantly renders pixel-perfect PDF payslips using `@react-pdf/renderer` directly from the browser.

### 3. Time & Attendance
*   **Live Check-In/Out**: Employees use the Portal to punch their time. The system calculates active duration and stores daily attendance logs.
*   **Leave Types & Allocations**: Define configurable leave types (Sick, Casual, Earned) and allocate days to specific employees.
*   **Leave Workflow**: Employees submit requests (e.g., Half-day Sick Leave) which route to HR/Managers for `APPROVED` or `REFUSED` states.
*   **Payroll Integration**: Unpaid leaves automatically sync with the Payroll Engine to deduct pay during the monthly Payrun.

### 4. Role-Based Access Control (RBAC)
Security is baked into every route and API endpoint using the following hierarchy:
1.  **`ADMIN`**: Full system access, including User management and company configuration.
2.  **`HR_PAYROLL_MANAGER`**: Can create payruns, modify salary structures, and validate payroll.
3.  **`HR_PAYROLL_USER`**: Can view payroll and attendance data, but cannot validate or execute payments.
4.  **`HR_MANAGER`**: Can manage employees and approve leave, but cannot access payroll data.
5.  **`EMPLOYEE`**: Restricted entirely to the `/portal`. Can only view their own data, payslips, and requests.

---

## 🏗️ Technical Architecture

### Folder Structure (Next.js App Router)
```text
paycore/
├── app/
│   ├── (app)/           # Authenticated Admin/HR routes (Dashboard, Employees, Payroll)
│   ├── (auth)/          # Public routes (Login, Forgot Password)
│   ├── api/             # RESTful Next.js API Routes
│   ├── portal/          # Employee Self-Service Portal
│   ├── layout.tsx       # Root layout with ThemeProvider
│   └── globals.css      # Core design system & CSS Variables
├── components/          # Reusable UI components (Modals, Tables, Avatars)
├── lib/                 # Core utilities
│   ├── auth/            # Session validation, password hashing, RBAC permissions
│   ├── db/              # Prisma client instantiation
│   └── utils/           # Audit logging, encryption, formatting
├── prisma/              # Database schema (schema.prisma) and migrations
└── scripts/             # Database seeders and maintenance scripts
```

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Vanilla CSS (CSS Variables) + Tailwind Utility Classes
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Generation**: `@react-pdf/renderer`
- **Themes**: `next-themes`
- **Validation**: `zod`

---

## 💻 Development Setup

### Prerequisites
- Node.js 20+
- `pnpm` (Package manager)
- PostgreSQL (Local or managed, e.g., Supabase/Neon)

### 1. Clone & Install
```bash
git clone https://github.com/darshanNhb/PayCore.git
cd PayCore/paycore
pnpm install
```

### 2. Environment Variables
Create a `.env` file in the `paycore/` directory:
```env
# Database connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/paycore?schema=public"

# Optional: Add any secret keys for JWT or encryption if implemented later
```

### 3. Database Initialization
Push the Prisma schema to your database and generate the client:
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the Database
To populate the database with realistic dummy data (Employees, Departments, Leave Allocations, etc.):
```bash
npx tsx scripts/seed-leave.ts
npx tsx scripts/fix-missing-users.ts
```

### 5. Run the Server
```bash
pnpm dev
```
Navigate to `http://localhost:3000`.

---

## 🔒 Default Credentials
When the database is seeded or an employee is created manually, the backend automatically provisions a User account linked to that Employee. 

To log in, use the details of any employee created:
- **Email**: The employee's `workEmail` (e.g., `admin@paycore.in`)
- **Password**: `PayCore_<FirstName>` (e.g., `PayCore_Admin`)

---

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
