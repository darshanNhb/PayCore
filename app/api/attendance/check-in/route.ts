import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    
    // Find employee linked to this user
    let employeeId = session.employeeId;
    if (!employeeId) {
      // If admin/manager without an explicit employeeId, check if one matches work email or fallback
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { employee: true },
      });
      if (user?.employee) {
        employeeId = user.employee.id;
      } else {
        // Find any active employee to associate or first employee
        const emp = await prisma.employee.findFirst({
          where: { deletedAt: null, status: "ACTIVE" },
        });
        if (emp) employeeId = emp.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: { code: "NO_EMPLOYEE_PROFILE", message: "User is not linked to an employee profile" } },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if already checked in today without checking out
    const active = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        checkOut: null,
        checkIn: { gte: startOfToday },
        deletedAt: null,
      },
    });

    if (active) {
      return NextResponse.json({
        data: active,
        message: "Already checked in",
      });
    }

    // Determine status (PRESENT vs LATE) based on schedule
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workingSchedule: {
          include: { slots: true },
        },
      },
    });

    const dayOfWeek = now.getDay();
    const slot = employee?.workingSchedule?.slots?.find((s) => s.dayOfWeek === dayOfWeek);

    let status: "PRESENT" | "LATE" = "PRESENT";
    if (slot) {
      const [slotH, slotM] = slot.startTime.split(":").map(Number);
      const slotStartTime = new Date(now);
      slotStartTime.setHours(slotH, slotM, 0, 0);

      // Grace period: 15 minutes
      const graceTime = new Date(slotStartTime.getTime() + 15 * 60 * 1000);
      if (now > graceTime) {
        status = "LATE";
      }
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId,
        workingScheduleId: employee?.workingScheduleId || null,
        checkIn: now,
        status,
        source: "WIDGET",
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
