import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { generatePayslipPdf } from "@/lib/payroll/pdf-generator";

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
        lines: true,
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    // Role check: Employees can only view/download their own payslips
    if (session.role === "EMPLOYEE" && session.employeeId !== payslip.employeeId) {
      return NextResponse.json({ error: "Unauthorized access to payslip" }, { status: 403 });
    }

    const earnings = payslip.lines
      .filter((l) => l.category === "BASIC" || l.category === "ALLOWANCE")
      .map((l) => ({ name: l.ruleName, amount: Number(l.amount) }));

    const deductions = payslip.lines
      .filter((l) => l.category === "DEDUCTION")
      .map((l) => ({ name: l.ruleName, amount: Number(l.amount) }));

    const periodStr = new Date(payslip.periodStart).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    const doc = generatePayslipPdf({
      companyName: "PayCore India Pvt. Ltd.",
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      employeeCode: payslip.employee.employeeCode,
      department: payslip.employee.department?.name || "General",
      jobPosition: payslip.employee.jobPosition?.title || "Staff",
      period: periodStr,
      workedDays: Number(payslip.workedDays),
      totalWorkingDays: Number(payslip.totalWorkingDays),
      unpaidLeaveDays: Number(payslip.unpaidLeaveDays),
      earnings,
      deductions,
      grossAmount: Number(payslip.grossAmount),
      totalDeductions: Number(payslip.totalDeductions),
      netAmount: Number(payslip.netAmount),
    });

    const pdfBuffer = doc.output("arraybuffer");
    const filename = `Payslip_${payslip.employee.employeeCode}_${periodStr.replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    console.error("[PDF Download Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
