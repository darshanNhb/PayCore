import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { workingScheduleSlotSchema } from "@/lib/validation/hr";
import { calculateWeeklyHours } from "@/lib/utils/schedule";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

const slotsArraySchema = z.array(workingScheduleSlotSchema);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "working_schedule", "update");
    const { id } = await params;

    const existing = await prisma.workingSchedule.findUnique({
      where: { id },
      include: { slots: true },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Working schedule not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validatedSlots = slotsArraySchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing slots
      await tx.workingScheduleSlot.deleteMany({
        where: { workingScheduleId: id },
      });

      // Insert new slots
      if (validatedSlots.length > 0) {
        await tx.workingScheduleSlot.createMany({
          data: validatedSlots.map((s) => ({
            workingScheduleId: id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
          })),
        });
      }

      return tx.workingSchedule.findUniqueOrThrow({
        where: { id },
        include: {
          slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        },
      });
    });

    const totalWeeklyHours = calculateWeeklyHours(updated.slots);

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "WorkingScheduleSlots",
      entityId: id,
      action: "UPDATE",
      beforeJson: existing.slots as any,
      afterJson: updated.slots as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...updated,
        totalWeeklyHours,
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
