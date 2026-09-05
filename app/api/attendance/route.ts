import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { manualAttendanceSchema } from "@/lib/validation/attendance";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));

    if (session.role === "EMPLOYEE" && (!employeeId || session.employeeId !== employeeId)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const where: any = { deletedAt: null };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (from || to) {
      where.checkIn = {};
      if (from) where.checkIn.gte = new Date(from);
      if (to) where.checkIn.lte = new Date(to);
    }

    const [total, records] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              avatarColor: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { checkIn: "desc" },
      }),
    ]);

    const formatted = records.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employee: {
        id: r.employee.id,
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        initials: `${r.employee.firstName[0] || ""}${r.employee.lastName[0] || ""}`.toUpperCase(),
        code: r.employee.employeeCode,
        avatarColor: r.employee.avatarColor || "bg-indigo-100 text-indigo-700",
        department: r.employee.department.name,
      },
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workedMinutes: r.workedMinutes,
      status: r.status,
      source: r.source,
      correctionReason: r.correctionReason,
    }));

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
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "attendance", "update");

    const body = await req.json();
    const validated = manualAttendanceSchema.parse(body);

    const checkIn = new Date(validated.checkIn);
    const checkOut = validated.checkOut ? new Date(validated.checkOut) : null;

    let workedMinutes: number | null = null;
    if (checkOut) {
      workedMinutes = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId: validated.employeeId,
        checkIn,
        checkOut,
        workedMinutes,
        status: validated.status || "MANUALLY_CORRECTED",
        source: "MANUAL",
        correctedByUserId: session.userId,
        correctionReason: validated.correctionReason,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "AttendanceRecord",
      entityId: record.id,
      action: "CREATE",
      afterJson: {
        employeeId: record.employeeId,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        reason: validated.correctionReason,
      },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: record }, { status: 201 });
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
