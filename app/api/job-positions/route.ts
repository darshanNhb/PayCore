import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { jobPositionSchema } from "@/lib/validation/hr";
import { getDefaultCompanyId } from "@/lib/company";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");

    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const jobPositions = await prisma.jobPosition.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { employees: { where: { deletedAt: null, status: "ACTIVE" } } } },
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ data: jobPositions });
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
    requirePermission(session.role, "employee", "create");

    const body = await req.json();
    const validated = jobPositionSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const jobPosition = await prisma.jobPosition.create({
      data: {
        title: validated.title,
        companyId,
        departmentId: validated.departmentId || null,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "JobPosition",
      entityId: jobPosition.id,
      action: "CREATE",
      afterJson: jobPosition as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: jobPosition }, { status: 201 });
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
