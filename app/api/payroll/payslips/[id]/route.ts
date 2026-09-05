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

    const payslip = await prisma.payslip.findUnique({
      where: { id, deletedAt: null },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
        payrun: true,
        contract: true,
        salaryStructure: true,
        lines: { orderBy: { sequence: "asc" } },
        warnings: true,
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payslip not found" } }, { status: 404 });
    }

    if (session.role === "EMPLOYEE" && session.employeeId !== payslip.employeeId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        ...payslip,
        grossAmount: Number(payslip.grossAmount),
        totalDeductions: Number(payslip.totalDeductions),
        netAmount: Number(payslip.netAmount),
        workedDays: Number(payslip.workedDays),
        totalWorkingDays: Number(payslip.totalWorkingDays),
        lines: payslip.lines.map((l) => ({
          ...l,
          amount: Number(l.amount),
        })),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
