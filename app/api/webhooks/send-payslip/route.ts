import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { generatePayslipPdf } from "@/lib/payroll/pdf-generator";
import { Receiver } from "@upstash/qstash";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("upstash-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify request came from QStash
    const isValid = await receiver.verify({
      signature,
      body: bodyText,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { payslipId } = payload;

    if (!payslipId) {
      return NextResponse.json({ error: "Missing payslipId" }, { status: 400 });
    }

    // 1. Fetch payslip data
    const slip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          include: { department: true, jobPosition: true },
        },
        payrun: true,
        lines: { orderBy: { sequence: "asc" } },
      },
    });

    if (!slip || slip.status === "CANCELLED") {
      return NextResponse.json({ error: "Payslip not found or cancelled" }, { status: 404 });
    }

    const emp = slip.employee;
    const email = emp.workEmail || emp.personalEmail;

    if (!email) {
      console.log(`[QStash] Skipping payslip ${payslipId}: No email for employee ${emp.id}`);
      return NextResponse.json({ message: "No email, skipped" });
    }

    // 2. Generate PDF
    const earnings = slip.lines
      .filter((l) => l.category === "BASIC" || l.category === "ALLOWANCE" || l.category === "GROSS")
      .map((l) => ({ name: l.ruleName, amount: Math.abs(Number(l.amount)) }));
    const deductions = slip.lines
      .filter((l) => l.category === "DEDUCTION")
      .map((l) => ({ name: l.ruleName, amount: Math.abs(Number(l.amount)) }));

    const periodStr = new Date(slip.payrun.periodStart).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    const doc = generatePayslipPdf({
      companyName: "PayCore India Pvt. Ltd.",
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeCode,
      department: emp.department?.name || "General",
      jobPosition: emp.jobPosition?.title || "Staff",
      period: periodStr,
      workedDays: Number(slip.workedDays),
      totalWorkingDays: Number(slip.totalWorkingDays),
      unpaidLeaveDays: Number(slip.unpaidLeaveDays),
      earnings,
      deductions,
      grossAmount: Number(slip.grossAmount),
      totalDeductions: Number(slip.totalDeductions),
      netAmount: Number(slip.netAmount),
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `Payslip_${emp.employeeCode}_${periodStr.replace(/\s+/g, "_")}.pdf`;

    // 3. Send Email
    await sendEmail({
      to: email,
      subject: `Your Payslip for ${periodStr} — PayCore`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #7c3aed); color: #fff; font-weight: 700; font-size: 20px; line-height: 40px; text-align: center;">P</div>
            <h2 style="margin: 12px 0 0; font-size: 20px; color: #0f172a;">PayCore</h2>
          </div>
          <h1 style="font-size: 22px; font-weight: 600; color: #0f172a; text-align: center; margin-bottom: 8px;">
            Payslip for ${periodStr}
          </h1>
          <p style="color: #64748b; text-align: center; font-size: 14px; margin-bottom: 24px;">
            Hi ${emp.firstName}, your payslip is attached below.
          </p>
          <div style="background: #f0f0ff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">Net Salary</p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #4338ca;">
              ₹${Number(slip.netAmount).toLocaleString("en-IN")}
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated email from PayCore. Please do not reply.
          </p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // 4. Mark payslip as emailed
    await prisma.payslip.update({
      where: { id: slip.id },
      data: { emailSentAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[QStash Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
