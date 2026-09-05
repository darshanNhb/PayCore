import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { workingScheduleSchema } from "@/lib/validation/hr";
import { getDefaultCompanyId } from "@/lib/company";
import { calculateWeeklyHours } from "@/lib/utils/schedule";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const schedules = await prisma.workingSchedule.findMany({
      where: { status: "ACTIVE" },
      include: {
        slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        _count: { select: { employees: { where: { deletedAt: null, status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const enriched = schedules.map((schedule) => ({
      ...schedule,
      totalWeeklyHours: calculateWeeklyHours(schedule.slots),
    }));

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
    requirePermission(session.role, "working_schedule", "create");

    const body = await req.json();
    const validated = workingScheduleSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const result = await prisma.$transaction(async (tx) => {
      if (validated.isDefault) {
        // Unmark previous default schedule
        await tx.workingSchedule.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const schedule = await tx.workingSchedule.create({
        data: {
          name: validated.name,
          timezone: validated.timezone,
          isDefault: validated.isDefault,
          companyId,
          slots: validated.slots?.length
            ? {
                create: validated.slots.map((s) => ({
                  dayOfWeek: s.dayOfWeek,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  breakMinutes: s.breakMinutes,
                })),
              }
            : undefined,
        },
        include: {
          slots: true,
        },
      });

      return schedule;
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "WorkingSchedule",
      entityId: result.id,
      action: "CREATE",
      afterJson: result as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...result,
        totalWeeklyHours: calculateWeeklyHours(result.slots),
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
