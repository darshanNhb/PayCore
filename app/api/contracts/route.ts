import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { contractSchema } from "@/lib/validation/hr";
import { generateNextContractNumber } from "@/lib/utils/code";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    if (session.role === "EMPLOYEE" && (!employeeId || session.employeeId !== employeeId)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const where: any = { deletedAt: null };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const formatted = contracts.map((c) => ({
      ...c,
      wagePerMonth: Number(c.wagePerMonth),
    }));

    return NextResponse.json({ data: formatted });
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
    requirePermission(session.role, "contract", "create");

    const body = await req.json();
    const validated = contractSchema.parse(body);

    const startDate = new Date(validated.startDate);
    const endDate = validated.endDate ? new Date(validated.endDate) : null;

    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE_RANGE", message: "End date must be after start date" } },
        { status: 400 }
      );
    }

    // Invariant check: Check for overlapping RUNNING contracts for this employee
    if (validated.status === "RUNNING") {
      const runningContracts = await prisma.contract.findMany({
        where: {
          employeeId: validated.employeeId,
          status: "RUNNING",
          deletedAt: null,
        },
      });

      for (const rc of runningContracts) {
        const rcStart = rc.startDate;
        const rcEnd = rc.endDate || new Date("9999-12-31");
        const newEnd = endDate || new Date("9999-12-31");

        // Overlap condition: max(start1, start2) < min(end1, end2)
        if (Math.max(startDate.getTime(), rcStart.getTime()) < Math.min(newEnd.getTime(), rcEnd.getTime())) {
          return NextResponse.json(
            {
              error: {
                code: "CONTRACT_OVERLAP",
                message: `Cannot have overlapping RUNNING contracts for the same employee. Conflicts with contract ${rc.contractNumber}.`,
              },
            },
            { status: 409 }
          );
        }
      }
    }

    const contractNumber = validated.contractNumber || (await generateNextContractNumber());

    const contract = await prisma.contract.create({
      data: {
        employeeId: validated.employeeId,
        contractNumber,
        departmentId: validated.departmentId,
        jobPositionId: validated.jobPositionId,
        salaryStructureId: validated.salaryStructureId,
        wagePerMonth: validated.wagePerMonth,
        startDate,
        endDate,
        status: validated.status,
        workingScheduleId: validated.workingScheduleId || null,
      },
      include: {
        department: true,
        jobPosition: true,
        salaryStructure: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Contract",
      entityId: contract.id,
      action: "CREATE",
      afterJson: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        employeeId: contract.employeeId,
        wagePerMonth: Number(contract.wagePerMonth),
        status: contract.status,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...contract,
        wagePerMonth: Number(contract.wagePerMonth),
      },
    }, { status: 201 });
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
