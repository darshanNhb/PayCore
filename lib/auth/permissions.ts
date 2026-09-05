import { UserRole } from "@prisma/client";

/**
 * Declarative RBAC permission system.
 * Maps roles to allowed { resource, action } pairs.
 * Used by requirePermission() in every route handler.
 *
 * @see PayCore_Build_Prompt.md Section 5
 */

// ── Resource/Action types ────────────────────

export type Resource =
  | "employee"
  | "contract"
  | "working_schedule"
  | "attendance"
  | "time_off_type"
  | "time_off_allocation"
  | "time_off_request"
  | "salary_structure"
  | "salary_rule"
  | "payrun"
  | "payslip"
  | "dashboard"
  | "user"
  | "audit_log"
  | "settings";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "refuse"
  | "compute"
  | "validate"
  | "mark_paid"
  | "send_payslips"
  | "read_own";

type Permission = `${Resource}:${Action}`;

// ── Permission definitions per role ──────────

const EMPLOYEE_PERMISSIONS: Permission[] = [
  "employee:read_own",
  "attendance:read_own",
  "attendance:create", // own check-in/out only (enforced at handler level)
  "time_off_request:read_own",
  "time_off_request:create", // own requests only
  "time_off_allocation:read_own",
  "payslip:read_own",
  "dashboard:read_own", // personal mini-summary only
];

const HR_MANAGER_PERMISSIONS: Permission[] = [
  ...EMPLOYEE_PERMISSIONS,
  "employee:create",
  "employee:read",
  "employee:update",
  "employee:delete",
  "contract:create",
  "contract:read",
  "contract:update",
  "contract:delete",
  "working_schedule:create",
  "working_schedule:read",
  "working_schedule:update",
  "working_schedule:delete",
  "attendance:read",
  "attendance:update", // manual corrections
  "time_off_type:create",
  "time_off_type:read",
  "time_off_type:update",
  "time_off_type:delete",
  "time_off_allocation:create",
  "time_off_allocation:read",
  "time_off_allocation:update",
  "time_off_request:read",
  "time_off_request:approve",
  "time_off_request:refuse",
  "dashboard:read",
];

const HR_PAYROLL_USER_PERMISSIONS: Permission[] = [
  ...HR_MANAGER_PERMISSIONS,
  "payrun:create",
  "payrun:read",
  "payrun:update",
  "payslip:read",
  "payslip:update",
  "salary_structure:read",
  "salary_rule:read",
  "payrun:compute",
  "payrun:validate",
];

const HR_PAYROLL_MANAGER_PERMISSIONS: Permission[] = [
  ...HR_PAYROLL_USER_PERMISSIONS,
  "payrun:delete",
  "payslip:delete",
  "salary_structure:create",
  "salary_structure:update",
  "salary_structure:delete",
  "salary_rule:create",
  "salary_rule:update",
  "salary_rule:delete",
  "payrun:mark_paid",
  "payrun:send_payslips",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...HR_PAYROLL_MANAGER_PERMISSIONS,
  "user:create",
  "user:read",
  "user:update",
  "user:delete",
  "audit_log:read",
  "settings:read",
  "settings:update",
];

// ── Permission map ───────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  [UserRole.EMPLOYEE]: new Set(EMPLOYEE_PERMISSIONS),
  [UserRole.HR_MANAGER]: new Set(HR_MANAGER_PERMISSIONS),
  [UserRole.HR_PAYROLL_USER]: new Set(HR_PAYROLL_USER_PERMISSIONS),
  [UserRole.HR_PAYROLL_MANAGER]: new Set(HR_PAYROLL_MANAGER_PERMISSIONS),
  [UserRole.ADMIN]: new Set(ADMIN_PERMISSIONS),
};

// ── Public API ───────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(
  role: UserRole | string,
  resource: Resource,
  action: Action
): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.has(`${resource}:${action}` as Permission);
}

/**
 * Require a permission — throws a structured error if denied.
 * Use in every route handler and server action.
 */
export function requirePermission(
  role: UserRole | string,
  resource: Resource,
  action: Action
): void {
  if (!hasPermission(role, resource, action)) {
    const error = new Error(
      `Forbidden: role '${role}' does not have '${action}' permission on '${resource}'`
    );
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
}

/**
 * Get all permissions for a role (useful for debugging/admin UI).
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] || []);
}
