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
    requirePermission(session.role, "time_off_request", "refuse");
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const decisionNote = body.decisionNote || "Request refused by manager.";

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id },
        include: { timeOffType: true, employee: true },
      });

      if (!request) {
        throw new Error("NOT_FOUND: Request not found");
      }

      // If it was already approved, symmetrically reverse the balance consumption!
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

      const updated = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: "REFUSED",
          decidedByUserId: session.userId,
          decidedAt: new Date(),
          decisionNote,
        },
      });

      return updated;
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffRequest",
      entityId: id,
      action: "REFUSE",
      afterJson: {
        id,
        status: "REFUSED",
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
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
