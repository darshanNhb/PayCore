import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: { timeOffType: true },
    });

    if (!request) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }

    // Must be the owner employee or have HR permissions
    const isOwner = session.role === "EMPLOYEE" && session.employeeId === request.employeeId;
    const isHrOrAdmin = ["ADMIN", "HR_MANAGER", "HR_PAYROLL_MANAGER"].includes(session.role);

    if (!isOwner && !isHrOrAdmin) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If was approved, reverse allocation
      if (request.status === "APPROVED" && request.allocationId && request.timeOffType.requiresAllocation) {
        await tx.timeOffAllocation.update({
          where: { id: request.allocationId },
          data: {
            takenAmount: {
              decrement: Number(request.durationAmount),
            },
          },
        });
      }

      return tx.timeOffRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          decidedByUserId: session.userId,
          decidedAt: new Date(),
          decisionNote: "Cancelled by user",
        },
      });
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffRequest",
      entityId: id,
      action: "UPDATE",
      afterJson: { id, status: "CANCELLED" },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
