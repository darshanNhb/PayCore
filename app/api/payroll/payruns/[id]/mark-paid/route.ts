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
    requirePermission(session.role, "payrun", "mark_paid");
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

    if (payrun.status !== "VALIDATED") {
      return NextResponse.json(
        { error: { code: "NOT_VALIDATED", message: "Payrun must be validated before marking paid" } },
        { status: 400 }
      );
    }

    // Check for unresolved blocking warnings (missing bank details, negative net pay)
    const blockers = payrun.payslips
      .flatMap((p) => p.warnings)
      .filter((w) => w.type === "MISSING_BANK_DETAILS" || w.type === "NEGATIVE_NET_PAY");

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "BLOCKING_WARNINGS",
            message: `Cannot mark paid: ${blockers.length} unresolved blocking warnings exist (missing bank details or negative net pay).`,
          },
        },
        { status: 422 }
      );
    }

    const paidAt = new Date();

    await prisma.$transaction([
      prisma.payslip.updateMany({
        where: { payrunId: id },
        data: { status: "PAID" },
      }),
      prisma.payrun.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt,
        },
      }),
    ]);

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: id,
      action: "MARK_PAID",
      afterJson: { id, status: "PAID", paidAt },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        message: "Payrun marked as paid successfully",
        status: "PAID",
        paidAt,
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
