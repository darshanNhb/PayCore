import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { workingScheduleUpdateSchema } from "@/lib/validation/hr";
import { calculateWeeklyHours } from "@/lib/utils/schedule";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const schedule = await prisma.workingSchedule.findUnique({
      where: { id },
      include: {
        slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        employees: { where: { deletedAt: null, status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Working schedule not found" } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...schedule,
        totalWeeklyHours: calculateWeeklyHours(schedule.slots),
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
    requirePermission(session.role, "working_schedule", "update");
    const { id } = await params;

    const existing = await prisma.workingSchedule.findUnique({ where: { id }, include: { slots: true } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Working schedule not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = workingScheduleUpdateSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      if (validated.isDefault) {
        await tx.workingSchedule.updateMany({
          where: { companyId: existing.companyId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.workingSchedule.update({
        where: { id },
        data: {
          name: validated.name,
          timezone: validated.timezone,
          isDefault: validated.isDefault,
        },
        include: { slots: true },
      });
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "WorkingSchedule",
      entityId: id,
      action: "UPDATE",
      beforeJson: existing as any,
      afterJson: updated as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...updated,
        totalWeeklyHours: calculateWeeklyHours(updated.slots),
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
    requirePermission(session.role, "working_schedule", "delete");
    const { id } = await params;

    const existing = await prisma.workingSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Working schedule not found" } }, { status: 404 });
    }

    const updated = await prisma.workingSchedule.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "WorkingSchedule",
      entityId: id,
      action: "DELETE",
      beforeJson: existing as any,
      afterJson: updated as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Working schedule archived" } });
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
