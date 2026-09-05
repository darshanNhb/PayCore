import { z } from "zod";

export const salaryStructureSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(255).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const salaryRuleSchema = z.object({
  salaryStructureId: z.string().uuid("Salary structure ID is required"),
  name: z.string().min(2, "Rule name is required").max(100),
  code: z
    .string()
    .min(2, "Rule code is required")
    .max(20)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric and underscores only"),
  category: z.enum([
    "BASIC",
    "ALLOWANCE",
    "GROSS",
    "DEDUCTION",
    "EMPLOYER_CONTRIBUTION",
    "NET",
  ]),
  sequence: z.number().int().min(1, "Sequence must be at least 1"),
  computationMethod: z.enum(["FIXED_AMOUNT", "PERCENTAGE_OF_RULE", "FORMULA"]),
  fixedAmount: z.number().nullable().optional(),
  percentageOfRuleCode: z.string().nullable().optional(),
  percentageValue: z.number().nullable().optional(),
  formulaExpression: z.string().nullable().optional(),
  appearsOnPayslip: z.boolean().default(true),
  active: z.boolean().default(true),
  isProrated: z.boolean().default(true),
});

export const validateFormulaSchema = z.object({
  expression: z.string().min(1, "Expression is required"),
  availableRuleCodes: z.array(z.string()).default([]),
});
