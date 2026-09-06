import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { timeOffRequestSchema } from "@/lib/validation/time-off";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: any = {};

    // If regular employee, only view own requests
    if (session.role === "EMPLOYEE") {
      where.employeeId = session.employeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            avatarColor: true,
            department: { select: { name: true } },
          },
        },
        timeOffType: true,
        allocation: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employee: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeInitials: `${r.employee.firstName[0] || ""}${r.employee.lastName[0] || ""}`.toUpperCase(),
      employeeAvatarColor: r.employee.avatarColor || "bg-indigo-100 text-indigo-700",
      type: r.timeOffType.name,
      typeId: r.timeOffTypeId,
      startDate: r.startDate,
      endDate: r.endDate,
      dates: `${new Date(r.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })} – ${new Date(r.endDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      duration: Number(r.durationAmount),
      unit: r.timeOffType.unit,
      status: r.status,
      reason: r.reason || "Personal",
      decisionNote: r.decisionNote,
      createdAt: r.createdAt,
      allocation: r.allocation ? {
        allocatedAmount: Number(r.allocation.allocatedAmount),
        takenAmount: Number(r.allocation.takenAmount)
      } : null,
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
    const body = await req.json();
    const validated = timeOffRequestSchema.parse(body);

    // Determine employeeId
    let employeeId = validated.employeeId;
    if (session.role === "EMPLOYEE") {
      employeeId = session.employeeId;
    }
    if (!employeeId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Employee ID is required" } },
        { status: 400 }
      );
    }

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    if (endDate < startDate) {
      return NextResponse.json(
        { error: { code: "INVALID_DATES", message: "End date cannot be before start date" } },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Cannot request time off for past dates." } }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Only active employees can request time off." } }, { status: 400 });
    }

    const overlapping = await prisma.timeOffRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["TO_APPROVE", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });
    if (overlapping) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A time off request already exists for these dates." } }, { status: 400 });
    }

    const type = await prisma.timeOffType.findUnique({
      where: { id: validated.timeOffTypeId },
    });
    if (!type) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Time off type not found" } }, { status: 404 });
    }

    // If type requires allocation, pre-check if an active approved allocation exists
    let allocationId: string | null = null;
    if (type.requiresAllocation) {
      const activeAllocation = await prisma.timeOffAllocation.findFirst({
        where: {
          employeeId,
          timeOffTypeId: type.id,
          status: "APPROVED",
          OR: [
            { validTo: null },
            { validTo: { gte: startDate } },
          ],
        },
        orderBy: { validFrom: "asc" },
      });

      if (!activeAllocation) {
        return NextResponse.json(
          {
            error: {
              code: "NO_ALLOCATION",
              message: `No active allocation found for ${type.name}. Please contact HR to allocate leave days.`,
            },
          },
          { status: 422 }
        );
      }
      allocationId = activeAllocation.id;
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        employeeId,
        timeOffTypeId: validated.timeOffTypeId,
        allocationId,
        startDate,
        endDate,
        durationAmount: validated.durationAmount,
        reason: validated.reason,
        status: "TO_APPROVE",
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        timeOffType: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffRequest",
      entityId: request.id,
      action: "CREATE",
      afterJson: {
        employee: `${request.employee.firstName} ${request.employee.lastName}`,
        type: request.timeOffType.name,
        duration: Number(request.durationAmount),
        reason: request.reason,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
