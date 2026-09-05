import { evaluateFormula, FormulaScope } from "./evaluator";

export interface EngineRule {
  id: string;
  name: string;
  code: string;
  category: "BASIC" | "ALLOWANCE" | "GROSS" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION" | "NET";
  sequence: number;
  computationMethod: "FIXED_AMOUNT" | "PERCENTAGE_OF_RULE" | "FORMULA";
  fixedAmount?: number | null;
  percentageOfRuleCode?: string | null;
  percentageValue?: number | null;
  formulaExpression?: string | null;
  appearsOnPayslip: boolean;
  active: boolean;
  isProrated: boolean;
}

export interface EngineInput {
  contractWage: number;
  workedDays: number;
  totalWorkingDays: number;
  unpaidLeaveDays: number;
  overtimeHours?: number;
  rules: EngineRule[];
  employee: {
    id: string;
    name: string;
    bankVerified: boolean;
    hasBankDetails: boolean;
    hasWorkingSchedule: boolean;
  };
  hasDuplicateInPeriod?: boolean;
}

export interface ComputedPayslipLine {
  salaryRuleId: string;
  ruleCode: string;
  ruleName: string;
  category: string;
  sequence: number;
  amount: number;
}

export interface ComputedWarning {
  type: "MISSING_BANK_DETAILS" | "DUPLICATE_PAYSLIP" | "MISSING_CONTRACT" | "NEGATIVE_NET_PAY" | "MISSING_WORKING_SCHEDULE" | "OTHER";
  message: string;
}

export interface EngineResult {
  lines: ComputedPayslipLine[];
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  warnings: ComputedWarning[];
}

/**
 * Pure payroll computation engine.
 * Computes ordered rules, produces payslip lines, and checks for warning conditions.
 */
export function computeEmployeePayroll(input: EngineInput): EngineResult {
  const {
    contractWage,
    workedDays,
    totalWorkingDays,
    unpaidLeaveDays,
    overtimeHours = 0,
    rules,
    employee,
    hasDuplicateInPeriod = false,
  } = input;

  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);
  const ruleValues: { [code: string]: number } = {};
  const lines: ComputedPayslipLine[] = [];

  const prorationRatio = totalWorkingDays > 0 ? Math.min(1, workedDays / totalWorkingDays) : 1;

  const baseScope: FormulaScope = {
    WORKED_DAYS: workedDays,
    TOTAL_WORKING_DAYS: totalWorkingDays,
    UNPAID_LEAVE_DAYS: unpaidLeaveDays,
    OVERTIME_HOURS: overtimeHours,
    CONTRACT_WAGE: contractWage,
    WAGE: contractWage,
    BASIC: contractWage, // default fallback if BASIC rule not yet computed
  };

  for (const rule of sortedRules) {
    if (!rule.active) continue;

    let amount = 0;

    switch (rule.computationMethod) {
      case "FIXED_AMOUNT": {
        const raw = rule.fixedAmount || 0;
        amount = rule.isProrated ? raw * prorationRatio : raw;
        break;
      }
      case "PERCENTAGE_OF_RULE": {
        const baseCode = rule.percentageOfRuleCode?.toUpperCase() || "BASIC";
        const baseAmount = ruleValues[baseCode] !== undefined ? ruleValues[baseCode] : contractWage;
        const pct = (rule.percentageValue || 0) / 100;
        amount = baseAmount * pct;
        break;
      }
      case "FORMULA": {
        if (rule.formulaExpression) {
          const currentScope: FormulaScope = {
            ...baseScope,
            ...ruleValues,
          };
          amount = evaluateFormula(rule.formulaExpression, currentScope);
        }
        break;
      }
    }

    amount = Number(amount.toFixed(2));
    ruleValues[rule.code.toUpperCase()] = amount;

    if (rule.appearsOnPayslip) {
      lines.push({
        salaryRuleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        category: rule.category,
        sequence: rule.sequence,
        amount,
      });
    }
  }

  // Calculate gross, deductions, and net
  let grossAmount = 0;
  let totalDeductions = 0;

  for (const line of lines) {
    if (line.category === "BASIC" || line.category === "ALLOWANCE") {
      grossAmount += line.amount;
    } else if (line.category === "DEDUCTION") {
      totalDeductions += Math.abs(line.amount);
    }
  }

  // If a GROSS rule exists explicitly, respect it
  if (ruleValues["GROSS"] !== undefined) {
    grossAmount = ruleValues["GROSS"];
  }

  const netAmount = Number((grossAmount - totalDeductions).toFixed(2));

  // Warnings detection
  const warnings: ComputedWarning[] = [];

  if (!employee.bankVerified || !employee.hasBankDetails) {
    warnings.push({
      type: "MISSING_BANK_DETAILS",
      message: `${employee.name} is missing verified bank account details.`,
    });
  }

  if (hasDuplicateInPeriod) {
    warnings.push({
      type: "DUPLICATE_PAYSLIP",
      message: `${employee.name} appears to have an existing payslip for this period.`,
    });
  }

  if (netAmount < 0) {
    warnings.push({
      type: "NEGATIVE_NET_PAY",
      message: `Negative net pay calculated (₹${netAmount.toLocaleString("en-IN")}) for ${employee.name}.`,
    });
  }

  if (!employee.hasWorkingSchedule) {
    warnings.push({
      type: "MISSING_WORKING_SCHEDULE",
      message: `${employee.name} has no working schedule assigned.`,
    });
  }

  return {
    lines,
    grossAmount: Number(grossAmount.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netAmount,
    warnings,
  };
}
