import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { salaryStructureSchema } from "@/lib/validation/payroll";
import { getDefaultCompanyId } from "@/lib/company";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const structures = await prisma.salaryStructure.findMany({
      where: { status: "ACTIVE" },
      include: {
        rules: { orderBy: { sequence: "asc" } },
        _count: { select: { contracts: { where: { status: "RUNNING", deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: structures });
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
    requirePermission(session.role, "salary_structure", "create");

    const body = await req.json();
    const validated = salaryStructureSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const structure = await prisma.salaryStructure.create({
      data: {
        companyId,
        name: validated.name,
        description: validated.description || null,
        status: validated.status,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "SalaryStructure",
      entityId: structure.id,
      action: "CREATE",
      afterJson: structure as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: structure }, { status: 201 });
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
