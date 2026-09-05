import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters").max(100),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
});

export const departmentUpdateSchema = departmentSchema.partial();

export const jobPositionSchema = z.object({
  title: z.string().min(2, "Job title must be at least 2 characters").max(100),
  departmentId: z.string().uuid().nullable().optional(),
});

export const jobPositionUpdateSchema = jobPositionSchema.partial();

export const workingScheduleSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm"),
  breakMinutes: z.number().int().min(0).default(0),
});

export const workingScheduleSchema = z.object({
  name: z.string().min(2, "Schedule name is required").max(100),
  timezone: z.string().default("Asia/Kolkata"),
  isDefault: z.boolean().default(false),
  slots: z.array(workingScheduleSlotSchema).optional(),
});

export const workingScheduleUpdateSchema = workingScheduleSchema.partial();

export const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  workEmail: z.string().email("Valid work email is required"),
  personalEmail: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional().or(z.literal("")),
  dateOfBirth: z.string().datetime().nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.literal("")),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  departmentId: z.string().uuid("Please select a department"),
  jobPositionId: z.string().uuid("Please select a job position"),
  managerId: z.string().uuid().nullable().optional().or(z.literal("")),
  workingScheduleId: z.string().uuid().nullable().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
  employeeType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  workLocation: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankIfsc: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  avatarColor: z.string().nullable().optional(),
  systemRole: z.enum(["EMPLOYEE", "HR_MANAGER", "HR_PAYROLL_USER", "HR_PAYROLL_MANAGER", "ADMIN"]).default("EMPLOYEE"),
});

export const employeeUpdateSchema = employeeSchema.partial();

export const contractSchema = z.object({
  employeeId: z.string().uuid("Employee is required"),
  contractNumber: z.string().optional(),
  departmentId: z.string().uuid("Department is required"),
  jobPositionId: z.string().uuid("Job position is required"),
  salaryStructureId: z.string().uuid("Salary structure is required"),
  wagePerMonth: z.number().positive("Wage per month must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "RUNNING", "EXPIRED", "CANCELLED"]).default("DRAFT"),
  workingScheduleId: z.string().uuid().nullable().optional().or(z.literal("")),
});

export const contractUpdateSchema = contractSchema.partial();
