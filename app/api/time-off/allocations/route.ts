import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { timeOffAllocationSchema } from "@/lib/validation/time-off";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (session.role === "EMPLOYEE" && (!employeeId || session.employeeId !== employeeId)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    const allocations = await prisma.timeOffAllocation.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        timeOffType: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { validFrom: "desc" },
    });

    const formatted = allocations.map((a) => {
      const allocated = Number(a.allocatedAmount);
      const taken = Number(a.takenAmount);
      return {
        ...a,
        allocatedAmount: allocated,
        takenAmount: taken,
        remainingAmount: allocated - taken,
      };
    });

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
    requirePermission(session.role, "time_off_allocation", "create");

    const body = await req.json();
    const validated = timeOffAllocationSchema.parse(body);

    const allocation = await prisma.timeOffAllocation.create({
      data: {
        employeeId: validated.employeeId,
        timeOffTypeId: validated.timeOffTypeId,
        allocatedAmount: validated.allocatedAmount,
        validFrom: new Date(validated.validFrom),
        validTo: validated.validTo ? new Date(validated.validTo) : null,
        status: "APPROVED", // Auto-approved if created by HR
        approvedByUserId: session.userId,
        approvedAt: new Date(),
      },
      include: {
        employee: true,
        timeOffType: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffAllocation",
      entityId: allocation.id,
      action: "CREATE",
      afterJson: {
        employeeId: allocation.employeeId,
        type: allocation.timeOffType.name,
        amount: Number(allocation.allocatedAmount),
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...allocation,
        allocatedAmount: Number(allocation.allocatedAmount),
        takenAmount: Number(allocation.takenAmount),
        remainingAmount: Number(allocation.allocatedAmount),
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
