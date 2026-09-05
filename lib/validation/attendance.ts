import { z } from "zod";

export const manualAttendanceSchema = z.object({
  employeeId: z.string().uuid("Employee ID is required"),
  checkIn: z.string().datetime("Valid ISO checkIn datetime is required"),
  checkOut: z.string().datetime().nullable().optional(),
  status: z.enum([
    "PRESENT",
    "LATE",
    "ABSENT",
    "MISSING_CHECKOUT",
    "MANUALLY_CORRECTED",
    "ON_LEAVE",
  ]).optional(),
  correctionReason: z.string().min(3, "Correction reason is required").max(500),
});

export const updateAttendanceSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().nullable().optional(),
  status: z.enum([
    "PRESENT",
    "LATE",
    "ABSENT",
    "MISSING_CHECKOUT",
    "MANUALLY_CORRECTED",
    "ON_LEAVE",
  ]).optional(),
  correctionReason: z.string().min(3, "Correction reason is required for manual edits").max(500),
});
