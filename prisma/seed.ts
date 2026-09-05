import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "PayCore India Pvt. Ltd.",
    }
  });

  const dept = await prisma.department.create({
    data: {
      name: "Administration",
      companyId: company.id,
    }
  });

  const pos = await prisma.jobPosition.create({
    data: {
      title: "System Administrator",
      departmentId: dept.id,
      companyId: company.id,
    }
  });

  const employee = await prisma.employee.create({
    data: {
      firstName: "Darshan",
      lastName: "Admin",
      workEmail: "buddhdevdarshan1478@gmail.com",
      employeeCode: "EMP001",
      jobPositionId: pos.id,
      departmentId: dept.id,
      companyId: company.id,
      dateOfJoining: new Date("2026-01-01"),
      status: "ACTIVE",
    }
  });

  const passwordHash = await hashPassword("DB@#1478");

  const user = await prisma.user.create({
    data: {
      email: "buddhdevdarshan1478@gmail.com",
      passwordHash,
      firstName: "Darshan",
      lastName: "Admin",
      role: "ADMIN",
      employeeId: employee.id,
      isActive: true,
    }
  });

  console.log(`Seed complete. Admin created with email: ${user.email}, password: "DB@#1478"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
