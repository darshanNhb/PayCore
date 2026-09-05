import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";

const resolveWarningSchema = z.object({
  warningId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payslip", "update");
    const { id } = await params;

    const body = await req.json();
    const { warningId } = resolveWarningSchema.parse(body);

    const warning = await prisma.payslipWarning.findUnique({
      where: { id: warningId, payslipId: id },
    });

    if (!warning) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Warning not found" } }, { status: 404 });
    }

    const updated = await prisma.payslipWarning.update({
      where: { id: warningId },
      data: { resolved: true },
    });

    // Check if payslip still has unresolved warnings
    const remainingUnresolved = await prisma.payslipWarning.count({
      where: { payslipId: id, resolved: false },
    });

    if (remainingUnresolved === 0) {
      await prisma.payslip.update({
        where: { id },
        data: { hasWarnings: false },
      });
    }

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
