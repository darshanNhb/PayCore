import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { computeEmployeePayroll, EngineRule } from "@/lib/payroll/engine";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payrun", "compute");
    const { id } = await params;

    const payrun = await prisma.payrun.findUnique({
      where: { id, deletedAt: null },
      include: {
        salaryStructure: {
          include: {
            rules: {
              where: { active: true },
              orderBy: { sequence: "asc" },
            },
          },
        },
        payslips: {
          include: {
            employee: true,
            contract: true,
          },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payrun not found" } }, { status: 404 });
    }

    if (payrun.status === "PAID") {
      return NextResponse.json(
        { error: { code: "CANNOT_COMPUTE_PAID", message: "Cannot recompute a payrun that has already been marked paid" } },
        { status: 400 }
      );
    }

    const rules: EngineRule[] = payrun.salaryStructure.rules.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      category: r.category as any,
      sequence: r.sequence,
      computationMethod: r.computationMethod as any,
      fixedAmount: r.fixedAmount ? Number(r.fixedAmount) : null,
      percentageOfRuleCode: r.percentageOfRuleCode,
      percentageValue: r.percentageValue ? Number(r.percentageValue) : null,
      formulaExpression: r.formulaExpression,
      appearsOnPayslip: r.appearsOnPayslip,
      active: r.active,
      isProrated: r.isProrated,
    }));

    await prisma.$transaction(async (tx) => {
      for (const slip of payrun.payslips) {
        const contractWage = slip.contract ? Number(slip.contract.wagePerMonth) : 0;

        // Check duplicate payslip in this same period across other payruns
        const duplicateCount = await tx.payslip.count({
          where: {
            employeeId: slip.employeeId,
            payrunId: { not: id },
            status: { not: "CANCELLED" },
            periodStart: { lte: payrun.periodEnd },
            periodEnd: { gte: payrun.periodStart },
          },
        });

        // Compute payroll through pure engine
        const result = computeEmployeePayroll({
          contractWage,
          workedDays: Number(slip.workedDays),
          totalWorkingDays: Number(slip.totalWorkingDays),
          unpaidLeaveDays: Number(slip.unpaidLeaveDays),
          rules,
          employee: {
            id: slip.employee.id,
            name: `${slip.employee.firstName} ${slip.employee.lastName}`,
            bankVerified: slip.employee.bankVerified,
            hasBankDetails: Boolean(slip.employee.bankAccountNumberEncrypted),
            hasWorkingSchedule: Boolean(slip.employee.workingScheduleId),
          },
          hasDuplicateInPeriod: duplicateCount > 0,
        });

        // Delete old lines & warnings
        await tx.payslipLine.deleteMany({ where: { payslipId: slip.id } });
        await tx.payslipWarning.deleteMany({ where: { payslipId: slip.id } });

        // Insert new lines
        if (result.lines.length > 0) {
          await tx.payslipLine.createMany({
            data: result.lines.map((l) => ({
              payslipId: slip.id,
              salaryRuleId: l.salaryRuleId,
              ruleCode: l.ruleCode,
              ruleName: l.ruleName,
              category: l.category as any,
              sequence: l.sequence,
              amount: l.amount,
            })),
          });
        }

        // Insert warnings
        if (result.warnings.length > 0) {
          await tx.payslipWarning.createMany({
            data: result.warnings.map((w) => ({
              payslipId: slip.id,
              type: w.type,
              message: w.message,
              resolved: false,
            })),
          });
        }

        // Update payslip totals
        await tx.payslip.update({
          where: { id: slip.id },
          data: {
            grossAmount: result.grossAmount,
            totalDeductions: result.totalDeductions,
            netAmount: result.netAmount,
            hasWarnings: result.warnings.length > 0,
            status: "COMPUTED",
          },
        });
      }

      // Update payrun status
      await tx.payrun.update({
        where: { id },
        data: {
          status: "COMPUTED",
          computedAt: new Date(),
        },
      });
    }, { timeout: 60000 });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: id,
      action: "COMPUTE",
      afterJson: { id, name: payrun.name, status: "COMPUTED" },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        message: "Payrun computed successfully",
        status: "COMPUTED",
      },
    });
  } catch (error: any) {
    console.error("[Compute Payrun Error]", error);
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
