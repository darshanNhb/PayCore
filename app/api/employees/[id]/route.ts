import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { employeeUpdateSchema } from "@/lib/validation/hr";
import { encryptField, decryptField, maskSensitive } from "@/lib/security/crypto";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    // Check if user has permission to read any employee or if it's their own
    if (session.role === "EMPLOYEE" && session.employeeId !== id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cannot view another employee profile" } }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id, deletedAt: null },
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true, workEmail: true } },
        workingSchedule: { select: { id: true, name: true, timezone: true } },
        contracts: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
          include: { salaryStructure: { select: { id: true, name: true } } },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found" } }, { status: 404 });
    }

    const isHrOrAdmin = ["ADMIN", "HR_MANAGER", "HR_PAYROLL_MANAGER"].includes(session.role);
    const rawBank = employee.bankAccountNumberEncrypted ? decryptField(employee.bankAccountNumberEncrypted) : null;
    const rawIfsc = employee.bankIfscEncrypted ? decryptField(employee.bankIfscEncrypted) : null;
    const rawPan = employee.panEncrypted ? decryptField(employee.panEncrypted) : null;

    const runningContract = employee.contracts.find((c) => c.status === "RUNNING");

    return NextResponse.json({
      data: {
        ...employee,
        name: `${employee.firstName} ${employee.lastName}`,
        initials: `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase(),
        currentContract: runningContract || null,
        bankAccountMasked: maskSensitive(rawBank),
        bankIfsc: rawIfsc,
        panMasked: maskSensitive(rawPan),
        // Only return raw numbers if Admin/Payroll Manager
        rawBank: isHrOrAdmin ? rawBank : undefined,
        rawPan: isHrOrAdmin ? rawPan : undefined,
      },
    });
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

    const existing = await prisma.employee.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = employeeUpdateSchema.parse(body);

    const updateData: any = { ...validated };

    if (validated.bankAccountNumber !== undefined) {
      updateData.bankAccountNumberEncrypted = validated.bankAccountNumber
        ? encryptField(validated.bankAccountNumber)
        : null;
      delete updateData.bankAccountNumber;
    }
    if (validated.bankIfsc !== undefined) {
      updateData.bankIfscEncrypted = validated.bankIfsc
        ? encryptField(validated.bankIfsc)
        : null;
      delete updateData.bankIfsc;
    }
    if (validated.pan !== undefined) {
      updateData.panEncrypted = validated.pan ? encryptField(validated.pan) : null;
      delete updateData.pan;
    }

    if (updateData.bankAccountNumberEncrypted !== undefined || updateData.bankIfscEncrypted !== undefined) {
      const finalBank = updateData.bankAccountNumberEncrypted !== undefined ? updateData.bankAccountNumberEncrypted : existing.bankAccountNumberEncrypted;
      const finalIfsc = updateData.bankIfscEncrypted !== undefined ? updateData.bankIfscEncrypted : existing.bankIfscEncrypted;
      updateData.bankVerified = Boolean(finalBank && finalIfsc);
    }

    if (validated.dateOfBirth) updateData.dateOfBirth = new Date(validated.dateOfBirth);
    if (validated.dateOfJoining) updateData.dateOfJoining = new Date(validated.dateOfJoining);
    if (validated.managerId === "") updateData.managerId = null;
    if (validated.workingScheduleId === "") updateData.workingScheduleId = null;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { department: true, jobPosition: true },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Employee",
      entityId: id,
      action: "UPDATE",
      beforeJson: { firstName: existing.firstName, lastName: existing.lastName, status: existing.status },
      afterJson: { firstName: updated.firstName, lastName: updated.lastName, status: updated.status },
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

    const existing = await prisma.employee.findUnique({ 
      where: { id, deletedAt: null },
      include: { user: true }
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found" } }, { status: 404 });
    }

    if (existing.workEmail === "buddhdevdarshan1478@gmail.com") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cannot delete the main admin" } }, { status: 403 });
    }

    const softDeleted = await prisma.$transaction(async (tx) => {
      if (existing.user) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: "INACTIVE",
        },
      });
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Employee",
      entityId: id,
      action: "DELETE",
      beforeJson: { employeeCode: existing.employeeCode, name: `${existing.firstName} ${existing.lastName}` },
      afterJson: { deletedAt: softDeleted.deletedAt },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Employee soft deleted successfully" } });
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
