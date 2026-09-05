import {
  Activity,
  Banknote,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Users,
  WalletCards,
} from "lucide-react";
import { Resource, Action } from "@/lib/auth/permissions";

/**
 * Navigation configuration for the authenticated app shell.
 * Each item specifies the required permission to be visible.
 */

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredPermission: { resource: Resource; action: Action } | null;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: "WORKSPACE",
    items: [
      { name: "Overview", href: "/overview", icon: LayoutDashboard, requiredPermission: null },
      { name: "Employees", href: "/employees", icon: Users, requiredPermission: { resource: "employee", action: "read" } },
      { name: "Contracts", href: "/contracts", icon: FileText, requiredPermission: { resource: "contract", action: "read" } },
      { name: "Working Schedules", href: "/working-schedules", icon: Clock3, requiredPermission: { resource: "working_schedule", action: "read" } },
    ],
  },
  {
    group: "TIME & LEAVE",
    items: [
      { name: "Attendance", href: "/attendance", icon: CalendarDays, requiredPermission: { resource: "attendance", action: "read" } },
      { name: "Leave Requests", href: "/time-off/requests", icon: FolderOpen, requiredPermission: { resource: "time_off_request", action: "read" } },
      { name: "Allocations", href: "/time-off/allocations", icon: Gauge, requiredPermission: { resource: "time_off_allocation", action: "read" } },
    ],
  },
  {
    group: "PAYROLL",
    items: [
      { name: "Payroll Runs", href: "/payroll/payruns", icon: WalletCards, requiredPermission: { resource: "payrun", action: "read" } },
      { name: "Payslips", href: "/payroll/payslips", icon: Banknote, requiredPermission: { resource: "payslip", action: "read" } },
      { name: "Salary Structures", href: "/payroll/structures", icon: BriefcaseBusiness, requiredPermission: { resource: "salary_structure", action: "read" } },
      { name: "Salary Rules", href: "/payroll/rules", icon: Calculator, requiredPermission: { resource: "salary_rule", action: "read" } },
    ],
  },
  {
    group: "INSIGHTS",
    items: [
      { name: "Payroll Dashboard", href: "/dashboard", icon: Activity, requiredPermission: { resource: "dashboard", action: "read" } },
    ],
  },
];
