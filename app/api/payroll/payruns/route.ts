import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { getDefaultCompanyId } from "@/lib/company";
import { z } from "zod";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

const createPayrunSchema = z.object({
  name: z.string().min(2, "Payrun name is required"),
  salaryStructureId: z.string().uuid("Salary structure is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  employeeTypeScope: z.string().default("ALL"),
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee must be selected"),
});

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const payruns = await prisma.payrun.findMany({
      where: { deletedAt: null },
      include: {
        salaryStructure: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        payslips: {
          select: {
            id: true,
            grossAmount: true,
            totalDeductions: true,
            netAmount: true,
            hasWarnings: true,
            status: true,
          },
        },
      },
      orderBy: { periodStart: "desc" },
    });

    const enriched = payruns.map((pr) => {
      const employeeCount = pr.payslips.length;
      const totalNet = pr.payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);
      const totalGross = pr.payslips.reduce((sum, p) => sum + Number(p.grossAmount), 0);
      const warningsCount = pr.payslips.filter((p) => p.hasWarnings).length;

      return {
        id: pr.id,
        name: pr.name,
        periodStart: pr.periodStart,
        periodEnd: pr.periodEnd,
        status: pr.status,
        salaryStructureName: pr.salaryStructure.name,
        salaryStructureId: pr.salaryStructureId,
        employeeCount,
        totalNet,
        totalGross,
        warningsCount,
        createdBy: `${pr.createdByUser.firstName} ${pr.createdByUser.lastName}`,
        computedAt: pr.computedAt,
        validatedAt: pr.validatedAt,
        paidAt: pr.paidAt,
        createdAt: pr.createdAt,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payrun", "create");

    const body = await req.json();
    const validated = createPayrunSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const periodStart = new Date(validated.periodStart);
    const periodEnd = new Date(validated.periodEnd);

    // Fetch running contracts for each selected employee
    const contracts = await prisma.contract.findMany({
      where: {
        employeeId: { in: validated.employeeIds },
        status: "RUNNING",
        deletedAt: null,
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      include: { employee: true },
    });

    const contractMap = new Map<string, string>();
    for (const c of contracts) {
      contractMap.set(c.employeeId, c.id);
    }

    const payrun = await prisma.$transaction(async (tx) => {
      const pr = await tx.payrun.create({
        data: {
          companyId,
          name: validated.name,
          employeeTypeScope: validated.employeeTypeScope,
          salaryStructureId: validated.salaryStructureId,
          periodStart,
          periodEnd,
          status: "DRAFT",
          createdByUserId: session.userId,
        },
      });

      // Create one DRAFT payslip for each selected employee
      for (const empId of validated.employeeIds) {
        const contractId = contractMap.get(empId);
        if (!contractId) continue; // Skip if no running contract found

        await tx.payslip.create({
          data: {
            payrunId: pr.id,
            employeeId: empId,
            contractId,
            salaryStructureId: validated.salaryStructureId,
            periodStart,
            periodEnd,
            workedDays: 22,
            totalWorkingDays: 22,
            unpaidLeaveDays: 0,
            grossAmount: 0,
            totalDeductions: 0,
            netAmount: 0,
            status: "DRAFT",
            hasWarnings: false,
          },
        });
      }

      return pr;
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: payrun.id,
      action: "CREATE",
      afterJson: {
        name: payrun.name,
        period: `${validated.periodStart} to ${validated.periodEnd}`,
        employeeCount: validated.employeeIds.length,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: payrun }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
