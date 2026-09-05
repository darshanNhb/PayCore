import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER", "HR_MANAGER", "EMPLOYEE"]),
  employeeId: z.string().uuid("User must be linked to an employee"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "user", "read");

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        employeeId: true,
        employee: { select: { id: true, firstName: true, lastName: true, workEmail: true, employeeCode: true, department: { select: { name: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: users });
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "user", "create");

    const body = await req.json();
    const validated = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: validated.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: { code: "EMAIL_EXISTS", message: "User with this email already exists" } }, { status: 409 });
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
        employeeId: validated.employeeId || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        employeeId: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      afterJson: { email: user.email, role: user.role },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: user }, { status: 201 });
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
