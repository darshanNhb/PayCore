import { z } from "zod";

/**
 * Zod validation schemas for auth-related API inputs.
 * Shared between client (react-hook-form resolvers) and server (route handlers).
 *
 * @see PayCore_Build_Prompt.md Section 6
 */

/**
 * Password strength requirements:
 * - Minimum 10 characters
 * - At least one letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Login request schema.
 */
export const loginSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

/**
 * Forgot password request schema.
 */
export const forgotPasswordSchema = z
  .object({
    email: z.email("Invalid email address"),
  })
  .strict();

/**
 * Reset password request schema.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
  })
  .strict();

/**
 * User invitation/creation schema (admin).
 */
export const createUserSchema = z
  .object({
    email: z.email("Invalid email address"),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    role: z.enum([
      "ADMIN",
      "HR_PAYROLL_MANAGER",
      "HR_PAYROLL_USER",
      "HR_MANAGER",
      "EMPLOYEE",
    ]),
    employeeId: z.string().uuid().optional(),
  })
  .strict();

// ── Type exports ─────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
