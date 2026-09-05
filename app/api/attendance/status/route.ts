import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
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
      return NextResponse.json({
        data: { checkedIn: false, activeRecord: null, elapsedSeconds: 0 },
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const active = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        checkOut: null,
        checkIn: { gte: startOfToday },
        deletedAt: null,
      },
      orderBy: { checkIn: "desc" },
    });

    if (!active) {
      return NextResponse.json({
        data: { checkedIn: false, activeRecord: null, elapsedSeconds: 0 },
      });
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - new Date(active.checkIn).getTime()) / 1000)
    );

    return NextResponse.json({
      data: {
        checkedIn: true,
        activeRecord: active,
        checkInTime: active.checkIn,
        elapsedSeconds,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
