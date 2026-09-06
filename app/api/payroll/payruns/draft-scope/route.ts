import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";

const draftScopeSchema = z.object({
  salaryStructureId: z.string().uuid("Salary structure is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  employeeTypeScope: z.string().default("ALL"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "payrun", "create");

    const body = await req.json();
    const validated = draftScopeSchema.parse(body);

    const start = new Date(validated.periodStart);
    const end = new Date(validated.periodEnd);

    const employeeWhere: any = {
      status: "ACTIVE",
      deletedAt: null,
    };

    if (validated.employeeTypeScope !== "ALL") {
      employeeWhere.employeeType = validated.employeeTypeScope;
    }

    // Find active employees who have a RUNNING contract covering the period
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
        contracts: {
          where: {
            status: "RUNNING",
            deletedAt: null,
            startDate: { lte: end },
            OR: [
              { endDate: null },
              { endDate: { gte: start } },
            ],
          },
          include: { salaryStructure: true },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const eligible = employees.map((e) => {
      const contract = e.contracts[0];
      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        employeeCode: e.employeeCode,
        department: e.department.name,
        jobPosition: e.jobPosition.title,
        hasRunningContract: Boolean(contract),
        contractId: contract?.id || null,
        wagePerMonth: contract ? Number(contract.wagePerMonth) : 0,
        bankVerified: e.bankVerified,
        avatarColor: e.avatarColor || "bg-indigo-100 text-indigo-700",
      };
    });

    return NextResponse.json({
      data: {
        eligibleEmployees: eligible,
        totalEligible: eligible.filter((e) => e.hasRunningContract).length,
        totalChecked: eligible.length,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    if (error instanceof z.ZodError || error.name === "ZodError") {
      const message = error.errors?.[0]?.message || error.issues?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
    }
    console.error("[Draft Scope Error]", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
