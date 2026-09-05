import { prisma } from "@/lib/db";

/**
 * Get or ensure the primary Company ID for single-tenant v1.
 */
export async function getDefaultCompanyId(): Promise<string> {
  const company = await prisma.company.findFirst({ select: { id: true } });
  if (company) {
    return company.id;
  }
  const created = await prisma.company.create({
    data: {
      name: "PayCore India Pvt. Ltd.",
      legalName: "PayCore Technologies India Private Limited",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
    select: { id: true },
  });
  return created.id;
}
