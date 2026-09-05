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
    requirePermission(session.role, "payrun", "validate");
    const { id } = await params;

    const payrun = await prisma.payrun.findUnique({
      where: { id, deletedAt: null },
      include: {
        payslips: {
          include: {
            warnings: { where: { resolved: false } },
          },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payrun not found" } }, { status: 404 });
    }

    if (payrun.status === "DRAFT") {
      return NextResponse.json(
        { error: { code: "NOT_COMPUTED", message: "Payrun must be computed before validation" } },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.payslip.updateMany({
        where: { payrunId: id },
        data: { status: "VALIDATED" },
      }),
      prisma.payrun.update({
        where: { id },
        data: {
          status: "VALIDATED",
          validatedByUserId: session.userId,
          validatedAt: new Date(),
        },
      }),
    ]);

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: id,
      action: "VALIDATE",
      afterJson: { id, status: "VALIDATED" },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        message: "Payrun validated successfully",
        status: "VALIDATED",
      },
    });
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
