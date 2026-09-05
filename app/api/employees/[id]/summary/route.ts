import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (session.role === "EMPLOYEE" && session.employeeId !== id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [contractsCount, attendanceCount, timeOffRequestsCount, allocationsCount] =
      await Promise.all([
        prisma.contract.count({
          where: { employeeId: id, deletedAt: null },
        }),
        prisma.attendanceRecord.count({
          where: {
            employeeId: id,
            deletedAt: null,
            checkIn: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.timeOffRequest.count({
          where: { employeeId: id },
        }),
        prisma.timeOffAllocation.count({
          where: {
            employeeId: id,
            status: "APPROVED",
            OR: [
              { validTo: null },
              { validTo: { gte: now } },
            ],
          },
        }),
      ]);

    return NextResponse.json({
      data: {
        contractsCount,
        attendanceThisMonth: attendanceCount,
        timeOffRequestsCount,
        activeAllocationsCount: allocationsCount,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
