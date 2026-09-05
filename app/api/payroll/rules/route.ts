import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { salaryRuleSchema } from "@/lib/validation/payroll";
import { validateFormula } from "@/lib/payroll/evaluator";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const structureId = searchParams.get("structureId");

    const where: any = {};
    if (structureId) where.salaryStructureId = structureId;

    const rules = await prisma.salaryRule.findMany({
      where,
      orderBy: [{ salaryStructureId: "asc" }, { sequence: "asc" }],
      include: {
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    const formatted = rules.map((r) => ({
      ...r,
      fixedAmount: r.fixedAmount ? Number(r.fixedAmount) : null,
      percentageValue: r.percentageValue ? Number(r.percentageValue) : null,
    }));

    return NextResponse.json({ data: formatted });
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
    requirePermission(session.role, "salary_rule", "create");

    const body = await req.json();
    const validated = salaryRuleSchema.parse(body);

    // If method is FORMULA, validate formula expression
    if (validated.computationMethod === "FORMULA") {
      if (!validated.formulaExpression) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Formula expression is required" } },
          { status: 400 }
        );
      }

      // Fetch existing rules in this structure with lower sequence
      const lowerRules = await prisma.salaryRule.findMany({
        where: {
          salaryStructureId: validated.salaryStructureId,
          sequence: { lt: validated.sequence },
        },
        select: { code: true },
      });

      const allowedCodes = lowerRules.map((r) => r.code);
      const validation = validateFormula(validated.formulaExpression, allowedCodes);
      if (!validation.valid) {
        return NextResponse.json(
          { error: { code: "INVALID_FORMULA", message: `Formula syntax error: ${validation.error}` } },
          { status: 400 }
        );
      }
    }

    const rule = await prisma.salaryRule.create({
      data: {
        salaryStructureId: validated.salaryStructureId,
        name: validated.name,
        code: validated.code.toUpperCase(),
        category: validated.category,
        sequence: validated.sequence,
        computationMethod: validated.computationMethod,
        fixedAmount: validated.fixedAmount !== undefined && validated.fixedAmount !== null ? validated.fixedAmount : null,
        percentageOfRuleCode: validated.percentageOfRuleCode || null,
        percentageValue: validated.percentageValue !== undefined && validated.percentageValue !== null ? validated.percentageValue : null,
        formulaExpression: validated.formulaExpression || null,
        appearsOnPayslip: validated.appearsOnPayslip,
        active: validated.active,
        isProrated: validated.isProrated,
      },
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "SalaryRule",
      entityId: rule.id,
      action: "CREATE",
      afterJson: rule as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...rule,
        fixedAmount: rule.fixedAmount ? Number(rule.fixedAmount) : null,
        percentageValue: rule.percentageValue ? Number(rule.percentageValue) : null,
      },
    }, { status: 201 });
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
