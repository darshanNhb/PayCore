import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/mailer";
import { generatePayslipPdf } from "@/lib/payroll/pdf-generator";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payrun", "mark_paid"); // reuse permission
    const { id } = await params;

    const payrun = await prisma.payrun.findUnique({
      where: { id, deletedAt: null },
      include: {
        payslips: {
          where: { status: { not: "CANCELLED" } },
          include: {
            employee: {
              include: {
                department: true,
                jobPosition: true,
              },
            },
            lines: {
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payrun not found" } },
        { status: 404 }
      );
    }

    if (payrun.sentPayslipsAt) {
      return NextResponse.json(
        { error: { code: "ALREADY_SENT", message: "Payslips have already been emailed for this payrun." } },
        { status: 400 }
      );
    }

    const periodStr = new Date(payrun.periodStart).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/webhooks/send-payslip`;

    if (!process.env.QSTASH_TOKEN) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "QSTASH_TOKEN is not configured" } },
        { status: 500 }
      );
    }

    const { Client } = require("@upstash/qstash");
    const client = new Client({ token: process.env.QSTASH_TOKEN });

    const messages = payrun.payslips.map((slip) => ({
      url: webhookUrl,
      body: { payslipId: slip.id },
    }));

    // Publish to QStash in bulk
    await client.batchJSON(messages);

    // Mark payrun as sent immediately
    await prisma.payrun.update({
      where: { id },
      data: { sentPayslipsAt: new Date() },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Payrun",
      entityId: id,
      action: "SEND_QUEUED",
      afterJson: { queuedCount: messages.length },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        message: `Successfully queued ${messages.length} payslip(s) for email delivery in the background.`,
        queuedCount: messages.length,
      },
    });
  } catch (error: any) {
    console.error("[Send Payslips Error]", error);
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
