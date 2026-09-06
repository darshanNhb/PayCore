import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "time_off_request", "approve");
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const decisionNote = body.decisionNote || "Approved — enjoy your time off.";

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id },
        include: { timeOffType: true, employee: true },
      });

      if (!request) {
        throw new Error("NOT_FOUND: Request not found");
      }
      if (request.status === "APPROVED") {
        return request;
      }

      const duration = Number(request.durationAmount);
      let unpaidDays = 0;

      // If this leave type requires allocation, validate balance and update
      if (request.timeOffType.requiresAllocation) {
        // Resolve valid allocation
        let allocation = request.allocationId
          ? await tx.timeOffAllocation.findUnique({ where: { id: request.allocationId } })
          : await tx.timeOffAllocation.findFirst({
              where: {
                employeeId: request.employeeId,
                timeOffTypeId: request.timeOffTypeId,
                status: "APPROVED",
                OR: [{ validTo: null }, { validTo: { gte: request.startDate } }],
              },
              orderBy: { validFrom: "asc" },
            });

        if (!allocation) {
          throw new Error("NO_ALLOCATION: No active approved allocation found for this employee");
        }

        const remaining = Number(allocation.allocatedAmount) - Number(allocation.takenAmount);
        unpaidDays = Math.max(0, duration - remaining);

        // Increment takenAmount

        await tx.timeOffAllocation.update({
          where: { id: allocation.id },
          data: {
            takenAmount: {
              increment: duration,
            },
          },
        });
      }

      const updated = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          decidedByUserId: session.userId,
          decidedAt: new Date(),
          decisionNote,
          unpaidDays,
        },
        include: {
          employee: true,
          timeOffType: true,
        },
      });

      return updated;
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffRequest",
      entityId: id,
      action: "APPROVE",
      afterJson: {
        employee: `${result.employee.firstName} ${result.employee.lastName}`,
        type: result.timeOffType.name,
        duration: Number(result.durationAmount),
        decisionNote,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    if (error.message?.startsWith("INSUFFICIENT_BALANCE")) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_BALANCE", message: error.message.replace("INSUFFICIENT_BALANCE: ", "") } },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
