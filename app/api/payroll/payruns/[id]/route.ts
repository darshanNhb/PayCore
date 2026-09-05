import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const payrun = await prisma.payrun.findUnique({
      where: { id, deletedAt: null },
      include: {
        salaryStructure: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        validatedByUser: { select: { id: true, firstName: true, lastName: true } },
        payslips: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatarColor: true, department: { select: { name: true } } } },
            warnings: true,
          },
          orderBy: { employee: { firstName: "asc" } },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payrun not found" } }, { status: 404 });
    }

    const totalNet = payrun.payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);
    const totalGross = payrun.payslips.reduce((sum, p) => sum + Number(p.grossAmount), 0);
    const allWarnings = payrun.payslips.flatMap((p) => p.warnings);

    return NextResponse.json({
      data: {
        ...payrun,
        totalNet,
        totalGross,
        employeeCount: payrun.payslips.length,
        warnings: allWarnings,
        hasBlockers: allWarnings.some((w) => !w.resolved && (w.type === "MISSING_BANK_DETAILS" || w.type === "NEGATIVE_NET_PAY")),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payrun", "delete");
    const { id } = await params;

    const payrun = await prisma.payrun.findUnique({ where: { id, deletedAt: null } });
    if (!payrun) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payrun not found" } }, { status: 404 });
    }

    if (payrun.status !== "DRAFT") {
      return NextResponse.json(
        { error: { code: "CANNOT_DELETE", message: "Only DRAFT payruns may be deleted" } },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.payslipLine.deleteMany({ where: { payslip: { payrunId: id } } }),
      prisma.payslipWarning.deleteMany({ where: { payslip: { payrunId: id } } }),
      prisma.payslip.deleteMany({ where: { payrunId: id } }),
      prisma.payrun.delete({ where: { id } }),
    ]);

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: id,
      action: "DELETE",
      beforeJson: { name: payrun.name, status: payrun.status },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Payrun deleted successfully" } });
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
