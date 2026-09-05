import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    
    let employeeId = session.employeeId;
    if (!employeeId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { employee: true },
      });
      if (user?.employee) {
        employeeId = user.employee.id;
      } else {
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

    // Find the latest active checkIn without a checkout
    const active = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        checkOut: null,
        deletedAt: null,
      },
      orderBy: { checkIn: "desc" },
    });

    if (!active) {
      return NextResponse.json(
        { error: { code: "NO_ACTIVE_CHECK_IN", message: "You are not currently checked in" } },
        { status: 400 }
      );
    }

    const workedMinutes = Math.max(
      0,
      Math.round((now.getTime() - new Date(active.checkIn).getTime()) / (1000 * 60))
    );

    const updated = await prisma.attendanceRecord.update({
      where: { id: active.id },
      data: {
        checkOut: now,
        workedMinutes,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
