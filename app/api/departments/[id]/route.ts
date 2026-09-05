import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { departmentUpdateSchema } from "@/lib/validation/hr";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: {
        parentDepartment: true,
        managerEmployee: true,
        employees: { where: { deletedAt: null } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Department not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: department });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "employee", "update");
    const { id } = await params;

    const existing = await prisma.department.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Department not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = departmentUpdateSchema.parse(body);

    const updated = await prisma.department.update({
      where: { id },
      data: validated,
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Department",
      entityId: id,
      action: "UPDATE",
      beforeJson: existing as any,
      afterJson: updated as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: updated });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "employee", "delete");
    const { id } = await params;

    const existing = await prisma.department.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Department not found" } }, { status: 404 });
    }

    const softDeleted = await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Department",
      entityId: id,
      action: "DELETE",
      beforeJson: existing as any,
      afterJson: softDeleted as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Department deleted successfully" } });
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
