import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { salaryRuleSchema } from "@/lib/validation/payroll";
import { validateFormula } from "@/lib/payroll/evaluator";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const rule = await prisma.salaryRule.findUnique({
      where: { id },
      include: { salaryStructure: true },
    });

    if (!rule) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Rule not found" } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...rule,
        fixedAmount: rule.fixedAmount ? Number(rule.fixedAmount) : null,
        percentageValue: rule.percentageValue ? Number(rule.percentageValue) : null,
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
    requirePermission(session.role, "salary_rule", "update");
    const { id } = await params;

    const existing = await prisma.salaryRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Rule not found" } }, { status: 404 });
    }

    const body = await req.json();
    const validated = salaryRuleSchema.partial().parse(body);

    if (validated.computationMethod === "FORMULA" || (!validated.computationMethod && existing.computationMethod === "FORMULA")) {
      const expr = validated.formulaExpression || existing.formulaExpression;
      if (expr) {
        const validation = validateFormula(expr);
        if (!validation.valid) {
          return NextResponse.json(
            { error: { code: "INVALID_FORMULA", message: `Formula error: ${validation.error}` } },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.salaryRule.update({
      where: { id },
      data: validated as any,
    });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "SalaryRule",
      entityId: id,
      action: "UPDATE",
      beforeJson: existing as any,
      afterJson: updated as any,
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({
      data: {
        ...updated,
        fixedAmount: updated.fixedAmount ? Number(updated.fixedAmount) : null,
        percentageValue: updated.percentageValue ? Number(updated.percentageValue) : null,
      },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "salary_rule", "delete");
    const { id } = await params;

    await prisma.salaryRule.delete({ where: { id } });

    await writeAuditLog({
      actorUserId: session.userId,
      entityType: "SalaryRule",
      entityId: id,
      action: "DELETE",
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });

    return NextResponse.json({ data: { message: "Rule deleted" } });
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
