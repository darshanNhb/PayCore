import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { validateFormulaSchema } from "@/lib/validation/payroll";
import { validateFormula } from "@/lib/payroll/evaluator";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const validated = validateFormulaSchema.parse(body);

    const result = validateFormula(validated.expression, validated.availableRuleCodes);

    if (!result.valid) {
      return NextResponse.json(
        { error: { code: "INVALID_FORMULA", message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        valid: true,
        sampleEvaluatedResult: result.result,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not logged in" } }, { status: 401 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}
