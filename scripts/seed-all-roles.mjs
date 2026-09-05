import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password.ts";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedAllRoles() {
  console.log("Provisioning users for all 5 RBAC roles...");

  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found!");
    return;
  }

  const passwordHash = await hashPassword("password");

  const rolesToSeed = [
    {
      email: "darshan@paycore.in",
      firstName: "Darshan",
      lastName: "Admin",
      role: "ADMIN",
    },
    {
      email: "priya.payroll@paycore.in",
      firstName: "Priya",
      lastName: "Sharma",
      role: "HR_PAYROLL_MANAGER",
    },
    {
      email: "rohit.payroll@paycore.in",
      firstName: "Rohit",
      lastName: "Verma",
      role: "HR_PAYROLL_USER",
    },
    {
      email: "sneha.hr@paycore.in",
      firstName: "Sneha",
      lastName: "Patel",
      role: "HR_MANAGER",
    },
    {
      email: "aarav.mehta@paycore.in",
      firstName: "Aarav",
      lastName: "Mehta",
      role: "EMPLOYEE",
    },
  ];

  for (const r of rolesToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: r.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: r.email,
          passwordHash,
          firstName: r.firstName,
          lastName: r.lastName,
          role: r.role,
          isActive: true,
        },
      });
      console.log(`✓ Created ${r.role} user: ${r.email}`);
    } else {
      await prisma.user.update({
        where: { email: r.email },
        data: { role: r.role },
      });
      console.log(`✓ Verified ${r.role} user: ${r.email}`);
    }
  }

  console.log("\nAll 5 RBAC roles are provisioned with password: 'password'");
}

seedAllRoles()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
