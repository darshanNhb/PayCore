import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { salaryStructureSchema } from "@/lib/validation/payroll";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        rules: { orderBy: { sequence: "asc" } },
      },
    });

    if (!structure) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Salary structure not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: structure });
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
    requirePermission(session.role, "salary_structure", "update");
    const { id } = await params;

    const body = await req.json();
    const validated = salaryStructureSchema.partial().parse(body);

    const updated = await prisma.salaryStructure.update({
      where: { id },
      data: validated,
      include: { rules: { orderBy: { sequence: "asc" } } },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, "salary_structure", "delete");
    const { id } = await params;

    await prisma.salaryStructure.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ data: { message: "Salary structure archived" } });
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
