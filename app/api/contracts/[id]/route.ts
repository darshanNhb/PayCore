import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { contractUpdateSchema } from "@/lib/validation/hr";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id, deletedAt: null },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true } },
        department: true,
        jobPosition: true,
        salaryStructure: true,
        workingSchedule: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contract not found" } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...contract,
        wagePerMonth: Number(contract.wagePerMonth),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "contract", "update");
    const { id } = await params;

    const existing = await prisma.contract.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contract not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = contractUpdateSchema.parse(body);

    const targetStatus = validated.status || existing.status;
    const targetStartDate = validated.startDate ? new Date(validated.startDate) : existing.startDate;
    const targetEndDate = validated.endDate !== undefined
      ? (validated.endDate ? new Date(validated.endDate) : null)
      : existing.endDate;

    if (targetEndDate && targetEndDate <= targetStartDate) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE_RANGE", message: "End date must be after start date" } },
        { status: 400 }
      );
    }

    // If RUNNING, check overlap against other RUNNING contracts
    if (targetStatus === "RUNNING") {
      const otherRunning = await prisma.contract.findMany({
        where: {
          employeeId: existing.employeeId,
          status: "RUNNING",
          deletedAt: null,
          id: { not: id },
        },
      });

      for (const rc of otherRunning) {
        const rcStart = rc.startDate;
        const rcEnd = rc.endDate || new Date("9999-12-31");
        const newEnd = targetEndDate || new Date("9999-12-31");

        if (Math.max(targetStartDate.getTime(), rcStart.getTime()) < Math.min(newEnd.getTime(), rcEnd.getTime())) {
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

    const updateData: any = { ...validated };
    if (validated.startDate) updateData.startDate = targetStartDate;
    if (validated.endDate !== undefined) updateData.endDate = targetEndDate;
    if (validated.workingScheduleId === "") updateData.workingScheduleId = null;

    const updated = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Contract",
      entityId: id,
      action: "UPDATE",
      beforeJson: { status: existing.status, wagePerMonth: Number(existing.wagePerMonth) },
      afterJson: { status: updated.status, wagePerMonth: Number(updated.wagePerMonth) },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...updated,
        wagePerMonth: Number(updated.wagePerMonth),
      },
    });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "contract", "delete");
    const { id } = await params;

    const existing = await prisma.contract.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contract not found" } }, { status: 404 });
    }

    const softDeleted = await prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Contract",
      entityId: id,
      action: "DELETE",
      beforeJson: { contractNumber: existing.contractNumber },
      afterJson: { deletedAt: softDeleted.deletedAt },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Contract deleted" } });
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
