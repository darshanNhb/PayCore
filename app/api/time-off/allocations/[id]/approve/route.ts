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
    requirePermission(session.role, "time_off_allocation", "update");
    const { id } = await params;

    const allocation = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!allocation) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Allocation not found" } }, { status: 404 });
    }

    const updated = await prisma.timeOffAllocation.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedByUserId: session.userId,
        approvedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffAllocation",
      entityId: id,
      action: "APPROVE",
      beforeJson: { status: allocation.status },
      afterJson: { status: updated.status },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: updated });
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
