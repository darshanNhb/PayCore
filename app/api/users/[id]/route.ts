import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER", "HR_MANAGER", "EMPLOYEE"]).optional(),
  isActive: z.boolean().optional(),
  employeeId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "user", "update");
    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    // Self-role-elevation prevention: reject if user tries to change their own role
    if (session.userId === id && validated.role && validated.role !== existing.role) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You cannot change your own role" } },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: validated,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "User",
      entityId: id,
      action: "UPDATE",
      beforeJson: { role: existing.role, isActive: existing.isActive },
      afterJson: { role: updated.role, isActive: updated.isActive },
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
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
