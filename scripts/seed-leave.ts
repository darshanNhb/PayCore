import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");

  console.log("Seeding Time Off Types...");
  
  let earnedLeave = await prisma.timeOffType.findFirst({ where: { name: "Earned Leave" } });
  if (!earnedLeave) {
    earnedLeave = await prisma.timeOffType.create({
      data: {
        name: "Earned Leave",
        requiresAllocation: true,
        unit: "DAYS",
        companyId: company.id,
      },
    });
  }

  let sickLeave = await prisma.timeOffType.findFirst({ where: { name: "Sick Leave" } });
  if (!sickLeave) {
    sickLeave = await prisma.timeOffType.create({
      data: {
        name: "Sick Leave",
        requiresAllocation: true,
        unit: "DAYS",
        companyId: company.id,
      },
    });
  }

  let wfh = await prisma.timeOffType.findFirst({ where: { name: "Work From Home" } });
  if (!wfh) {
    wfh = await prisma.timeOffType.create({
      data: {
        name: "Work From Home",
        requiresAllocation: false,
        unit: "DAYS",
        companyId: company.id,
      },
    });
  }

  console.log("Seeding Time Off Allocations...");
  const employees = await prisma.employee.findMany({ where: { deletedAt: null } });

  const currentYear = new Date().getFullYear();
  const validFrom = new Date(currentYear, 0, 1);
  const validTo = new Date(currentYear, 11, 31);

  for (const emp of employees) {
    // Earned Leave Allocation (20 days)
    let elAlloc = await prisma.timeOffAllocation.findFirst({
      where: {
        employeeId: emp.id,
        timeOffTypeId: earnedLeave.id,
        validFrom,
      },
    });
    if (!elAlloc) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: earnedLeave.id,
          allocatedAmount: 20,
          validFrom,
          validTo,
          status: "APPROVED",
        },
      });
    }

    // Sick Leave Allocation (7 days)
    let slAlloc = await prisma.timeOffAllocation.findFirst({
      where: {
        employeeId: emp.id,
        timeOffTypeId: sickLeave.id,
        validFrom,
      },
    });
    if (!slAlloc) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: sickLeave.id,
          allocatedAmount: 7,
          validFrom,
          validTo,
          status: "APPROVED",
        },
      });
    }
  }

  console.log("Seeding Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
