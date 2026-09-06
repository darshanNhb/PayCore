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
    const session = await requireSession();
    requirePermission(session.role, "payrun", "read");
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
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
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

    const schedules = await prisma.workingSchedule.findMany({
      include: { slots: true }
    });
    const scheduleMap = new Map(schedules.map(s => [s.id, s.slots]));

    const contractMap = new Map(contracts.map((c) => [c.employeeId, c.id]));

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

      // Build payslip data for all employees with running contracts
      const payslipData = await Promise.all(
        validated.employeeIds
          .filter((empId) => contractMap.has(empId))
          .map(async (empId) => {
            // Find approved time off requests overlapping this period
            const timeOffs = await tx.timeOffRequest.findMany({
              where: {
                employeeId: empId,
                status: "APPROVED",
                startDate: { lte: periodEnd },
                endDate: { gte: periodStart },
              },
            });

            // Find attendance to calculate overtime
            const attendances = await tx.attendanceRecord.findMany({
              where: {
                employeeId: empId,
                checkIn: { gte: periodStart, lte: periodEnd },
                workedMinutes: { not: null },
              },
              include: { employee: { select: { workingScheduleId: true } } }
            });

            let totalOvertimeMinutes = 0;
            for (const att of attendances) {
              const schedId = att.workingScheduleId || att.employee.workingScheduleId;
              if (!schedId) continue;
              const slots = scheduleMap.get(schedId);
              if (!slots) continue;

              const dayOfWeek = att.checkIn.getDay();
              const slot = slots.find(s => s.dayOfWeek === dayOfWeek);
              
              let expectedMinutes = 0;
              if (slot) {
                const [startH, startM] = slot.startTime.split(':').map(Number);
                const [endH, endM] = slot.endTime.split(':').map(Number);
                expectedMinutes = (endH * 60 + endM) - (startH * 60 + startM) - slot.breakMinutes;
              }

              if (att.workedMinutes && att.workedMinutes > expectedMinutes) {
                totalOvertimeMinutes += (att.workedMinutes - expectedMinutes);
              }
            }
            const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 100) / 100;

            // Sum unpaid days
            const unpaidLeaveDays = timeOffs.reduce((sum, req) => sum + Number(req.unpaidDays || 0), 0);
            
            const totalWorkingDays = 22;
            const workedDays = Math.max(0, totalWorkingDays - unpaidLeaveDays);

            return {
              payrunId: pr.id,
              employeeId: empId,
              contractId: contractMap.get(empId)!,
              salaryStructureId: validated.salaryStructureId,
              periodStart,
              periodEnd,
              workedDays,
              totalWorkingDays,
              unpaidLeaveDays,
              overtimeHours,
              grossAmount: 0,
              totalDeductions: 0,
              netAmount: 0,
              status: "DRAFT" as const,
              hasWarnings: false,
            };
          })
      );

      // Deduplicate by employeeId (in case same employee appears twice)
      const seen = new Set<string>();
      const uniquePayslipData = payslipData.filter(p => {
        if (seen.has(p.employeeId)) return false;
        seen.add(p.employeeId);
        return true;
      });

      if (uniquePayslipData.length > 0) {
        // Create payslips one-by-one to avoid createMany issues
        for (const slip of uniquePayslipData) {
          await tx.payslip.create({ data: slip });
        }
      }

      return pr;
    }, { timeout: 60000 });

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
    if (error instanceof z.ZodError || error.name === "ZodError") {
      const message = error.errors?.[0]?.message || error.issues?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
    }
    console.error("[Create Payrun Error]", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
