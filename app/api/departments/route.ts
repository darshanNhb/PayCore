import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { departmentSchema } from "@/lib/validation/hr";
import { getDefaultCompanyId } from "@/lib/company";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    // Any authenticated user can read departments for dropdowns/filters
    const departments = await prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        parentDepartment: { select: { id: true, name: true } },
        managerEmployee: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: { where: { deletedAt: null, status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: departments });
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
    const validated = departmentSchema.parse(body);
    const companyId = await getDefaultCompanyId();

    const department = await prisma.department.create({
      data: {
        name: validated.name,
        companyId,
        parentDepartmentId: validated.parentDepartmentId || null,
        managerEmployeeId: validated.managerEmployeeId || null,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Department",
      entityId: department.id,
      action: "CREATE",
      afterJson: department as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: department }, { status: 201 });
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
