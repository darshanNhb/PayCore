# PayCore

> The calm operating system for people and pay.

PayCore is a modern, comprehensive HR and Payroll Management System designed to simplify the complexities of running a business. Built with a sleek, premium interface and powerful backend automation, PayCore handles everything from employee onboarding and attendance tracking to automated payroll processing and payslip generation.

## ✨ Features

### 👥 Core HR & Employee Directory
- **Employee Lifecycle Management**: Seamlessly onboard new hires, track personal details, and manage job positions and departments.
- **Contract Management**: Track active, expired, and draft contracts with historical tracking and compensation details.
- **Smart Profiles**: Dedicated, beautiful profile pages for each employee displaying their timeline, manager hierarchy, and bank details.

### 💰 Automated Payroll Engine
- **Salary Structures & Rules**: Define custom salary formulas and rules (Basic, HRA, Provident Fund, Tax Deductions) tailored to your company's policy.
- **Dynamic Payruns**: Generate batch payruns with one click. PayCore automatically computes net pay based on active contracts, attendance exceptions, and leave days.
- **PDF Payslips**: Automatically generate pixel-perfect PDF payslips for employees that they can download instantly from their portal.

### ⏰ Time & Attendance
- **Self-Service Check-in**: Employees can punch in and out from their dedicated portal, complete with a live timer.
- **Leave Management**: Define leave types, grant allocations, and allow employees to request time off.
- **Manager Approvals**: Role-based access allows HR and Managers to approve or reject time-off requests with real-time balance validation.

### 🔐 Security & Access
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Administrators, HR Managers, Payroll Users, and Employees.
- **Employee Portal**: A restricted, beautifully designed self-service portal for employees to view their own data, download payslips, and request time off without accessing the admin dashboard.
- **Audit Logging**: Comprehensive tracking of sensitive actions (like creating employees or editing contracts) for compliance.

### 🎨 Premium Aesthetics
- **Light & Dark Mode**: True CSS-variable based theme support, dynamically adapting to user preferences.
- **Dynamic Dashboards**: Real-time KPI tracking, actionable severity alerts, and interactive charts.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Vanilla CSS (CSS Variables) + Tailwind Utility Classes
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Generation**: `@react-pdf/renderer`
- **Themes**: `next-themes`

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- `pnpm` package manager
- A running PostgreSQL instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/darshanNhb/PayCore.git
   cd PayCore/paycore
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/paycore?schema=public"
   # Add any other required secrets
   ```

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the Database (Optional but recommended)**
   ```bash
   npx tsx scripts/seed-leave.ts
   npx tsx scripts/fix-missing-users.ts
   ```

6. **Start the Development Server**
   ```bash
   pnpm dev
   ```
   Navigate to `http://localhost:3000` to view the application.

---

## 🔒 Default Credentials
When the database is seeded or an employee is created manually, the system automatically provisions a user account:
- **Email**: The employee's `workEmail` (e.g., `admin@paycore.in`)
- **Password**: `PayCore_<FirstName>` (e.g., `PayCore_Admin`)

---

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
