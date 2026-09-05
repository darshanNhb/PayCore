import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const payrunId = searchParams.get("payrunId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));

    const where: any = { deletedAt: null };

    if (session.role === "EMPLOYEE") {
      where.employeeId = session.employeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (payrunId) where.payrunId = payrunId;
    if (status) where.status = status;

    const [total, payslips] = await Promise.all([
      prisma.payslip.count({ where }),
      prisma.payslip.findMany({
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
              jobPosition: { select: { title: true } },
            },
          },
          payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
          warnings: true,
        },
        orderBy: [{ periodStart: "desc" }, { employee: { firstName: "asc" } }],
      }),
    ]);

    const formatted = payslips.map((p) => ({
      id: p.id,
      payrunId: p.payrunId,
      payrunName: p.payrun.name,
      employeeId: p.employeeId,
      employee: {
        id: p.employee.id,
        name: `${p.employee.firstName} ${p.employee.lastName}`,
        initials: `${p.employee.firstName[0] || ""}${p.employee.lastName[0] || ""}`.toUpperCase(),
        code: p.employee.employeeCode,
        avatarColor: p.employee.avatarColor || "bg-indigo-100 text-indigo-700",
        department: p.employee.department.name,
        role: p.employee.jobPosition.title,
      },
      period: new Date(p.periodStart).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      workedDays: Number(p.workedDays),
      grossSalary: Number(p.grossAmount),
      netPay: Number(p.netAmount),
      totalDeductions: Number(p.totalDeductions),
      status: p.status,
      hasWarnings: p.hasWarnings,
      warningsCount: p.warnings.filter((w) => !w.resolved).length,
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
