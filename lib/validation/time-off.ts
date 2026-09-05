import { z } from "zod";

export const timeOffTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  unit: z.enum(["DAYS", "HOURS"]).default("DAYS"),
  requiresAllocation: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  affectsPayroll: z.boolean().default(true),
  colorTag: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const timeOffAllocationSchema = z.object({
  employeeId: z.string().uuid("Employee is required"),
  timeOffTypeId: z.string().uuid("Time off type is required"),
  allocatedAmount: z.number().positive("Allocated amount must be positive"),
  validFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  validTo: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});

export const timeOffRequestSchema = z.object({
  employeeId: z.string().uuid().optional(), // optional if employee is self-requesting
  timeOffTypeId: z.string().uuid("Time off type is required"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  durationAmount: z.number().positive("Duration must be positive"),
  reason: z.string().min(2, "Reason is required").max(500),
});
