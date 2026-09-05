import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { timeOffTypeSchema } from "@/lib/validation/time-off";
import { getDefaultCompanyId } from "@/lib/company";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const types = await prisma.timeOffType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: types });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "time_off_type", "create");

    const body = await req.json();
    const validated = timeOffTypeSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const type = await prisma.timeOffType.create({
      data: {
        companyId,
        name: validated.name,
        unit: validated.unit,
        requiresAllocation: validated.requiresAllocation,
        requiresApproval: validated.requiresApproval,
        affectsPayroll: validated.affectsPayroll,
        colorTag: validated.colorTag || null,
        status: validated.status,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "TimeOffType",
      entityId: type.id,
      action: "CREATE",
      afterJson: type as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: type }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
