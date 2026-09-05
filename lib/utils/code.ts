import { prisma } from "@/lib/db";

export async function generateNextEmployeeCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.employee.count();
  let nextNum = count + 1;
  let code = `EMP/${currentYear}/${nextNum.toString().padStart(4, "0")}`;

  while (await prisma.employee.findUnique({ where: { employeeCode: code } })) {
    nextNum += 1;
    code = `EMP/${currentYear}/${nextNum.toString().padStart(4, "0")}`;
  }

  return code;
}

export async function generateNextContractNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.contract.count();
  let nextNum = count + 1;
  let code = `CON/${currentYear}/${nextNum.toString().padStart(4, "0")}`;

  while (await prisma.contract.findUnique({ where: { contractNumber: code } })) {
    nextNum += 1;
    code = `CON/${currentYear}/${nextNum.toString().padStart(4, "0")}`;
  }

  return code;
}
