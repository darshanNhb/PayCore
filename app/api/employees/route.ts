import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { employeeSchema } from "@/lib/validation/hr";
import { getDefaultCompanyId } from "@/lib/company";
import { generateNextEmployeeCode } from "@/lib/utils/code";
import { encryptField, decryptField, maskSensitive } from "@/lib/security/crypto";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "employee", "read");
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || "";
    const status = searchParams.get("status") || "";
    const employeeType = searchParams.get("employeeType") || "";

    const where: any = {
      deletedAt: null,
    };

    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (employeeType) where.employeeType = employeeType;

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { workEmail: { contains: q, mode: "insensitive" } },
        { employeeCode: { contains: q, mode: "insensitive" } },
        { jobPosition: { title: { contains: q, mode: "insensitive" } } },
        { department: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          contracts: {
            where: { status: "RUNNING", deletedAt: null },
            select: { wagePerMonth: true, status: true },
            take: 1,
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const formatted = employees.map((e) => {
      const runningContract = e.contracts[0];
      return {
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        name: `${e.firstName} ${e.lastName}`,
        initials: `${e.firstName[0] || ""}${e.lastName[0] || ""}`.toUpperCase(),
        workEmail: e.workEmail,
        department: e.department.name,
        departmentId: e.departmentId,
        jobPosition: e.jobPosition.title,
        jobPositionId: e.jobPositionId,
        manager: e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "—",
        managerId: e.managerId,
        status: e.status,
        employeeType: e.employeeType,
        avatarColor: e.avatarColor || "bg-indigo-100 text-indigo-700",
        bankVerified: e.bankVerified,
        hasBankDetails: Boolean(e.bankAccountNumberEncrypted),
        salary: runningContract ? Number(runningContract.wagePerMonth) : 0,
        createdAt: e.createdAt,
      };
    });

    return NextResponse.json({
      data: formatted,
      page,
      pageSize,
      total,
    });
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
    requirePermission(session.role, "employee", "create");

    const body = await req.json();
    const validated = employeeSchema.parse(body);
    const companyId = await getDefaultCompanyId();
    const employeeCode = await generateNextEmployeeCode();

    const avatarColors = [
      "bg-indigo-100 text-indigo-700",
      "bg-rose-100 text-rose-700",
      "bg-amber-100 text-amber-700",
      "bg-emerald-100 text-emerald-700",
      "bg-sky-100 text-sky-700",
      "bg-violet-100 text-violet-700",
    ];
    const chosenColor =
      validated.avatarColor ||
      avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const bankAccountNumberEncrypted = validated.bankAccountNumber
      ? encryptField(validated.bankAccountNumber)
      : null;
    const bankIfscEncrypted = validated.bankIfsc
      ? encryptField(validated.bankIfsc)
      : null;
    const panEncrypted = validated.pan ? encryptField(validated.pan) : null;
    const bankVerified = Boolean(validated.bankAccountNumber && validated.bankIfsc);

    // Default password: PayCore_<firstName>
    const rawPassword = `PayCore_${validated.firstName.trim()}`;
    const passwordHash = await hashPassword(rawPassword);

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          companyId,
          employeeCode,
          firstName: validated.firstName,
          lastName: validated.lastName,
          workEmail: validated.workEmail,
          personalEmail: validated.personalEmail || null,
          phone: validated.phone || null,
          dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
          dateOfJoining: new Date(validated.dateOfJoining),
          departmentId: validated.departmentId,
          jobPositionId: validated.jobPositionId,
          managerId: validated.managerId || null,
          workingScheduleId: validated.workingScheduleId || null,
          status: validated.status,
          employeeType: validated.employeeType,
          workLocation: validated.workLocation || "Bengaluru, India",
          avatarColor: chosenColor,
          bankAccountNumberEncrypted,
          bankIfscEncrypted,
          panEncrypted,
          bankVerified,
        },
        include: {
          department: true,
          jobPosition: true,
        },
      });

      await tx.user.create({
        data: {
          email: validated.workEmail,
          passwordHash,
          firstName: validated.firstName,
          lastName: validated.lastName,
          role: validated.systemRole || "EMPLOYEE",
          employeeId: emp.id,
          isActive: true,
        },
      });

      return emp;
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "Employee",
      entityId: employee.id,
      action: "CREATE",
      afterJson: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        workEmail: employee.workEmail,
        department: employee.department.name,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: employee }, { status: 201 });
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
