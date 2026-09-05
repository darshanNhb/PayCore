import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateAttendanceSchema } from "@/lib/validation/attendance";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "attendance", "update");
    const { id } = await params;

    const existing = await prisma.attendanceRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Attendance record not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateAttendanceSchema.parse(body);

    const checkIn = validated.checkIn ? new Date(validated.checkIn) : existing.checkIn;
    const checkOut = validated.checkOut !== undefined
      ? (validated.checkOut ? new Date(validated.checkOut) : null)
      : existing.checkOut;

    let workedMinutes = existing.workedMinutes;
    if (checkOut) {
      workedMinutes = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        checkIn,
        checkOut,
        workedMinutes,
        status: validated.status || "MANUALLY_CORRECTED",
        correctedByUserId: session.userId,
        correctionReason: validated.correctionReason,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "AttendanceRecord",
      entityId: id,
      action: "UPDATE",
      beforeJson: { checkIn: existing.checkIn, checkOut: existing.checkOut, status: existing.status },
      afterJson: { checkIn: updated.checkIn, checkOut: updated.checkOut, status: updated.status, reason: validated.correctionReason },
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
    requirePermission(session.role, "attendance", "delete");
    const { id } = await params;

    const existing = await prisma.attendanceRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Attendance record not found" } }, { status: 404 });
    }

    await prisma.attendanceRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "AttendanceRecord",
      entityId: id,
      action: "DELETE",
      beforeJson: { checkIn: existing.checkIn, checkOut: existing.checkOut, status: existing.status },
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Attendance record deleted" } });
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
