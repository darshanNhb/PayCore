import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "./lib/auth/password";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all employees that don't have a linked User account
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    include: { user: true },
  });

  for (const emp of employees) {
    if (emp.user) {
      console.log(`✓ ${emp.firstName} ${emp.lastName} already has a user account (${emp.user.email})`);
      continue;
    }

    // Create user account with default password PayCore_<FirstName>
    const rawPassword = `PayCore_${emp.firstName.trim()}`;
    const passwordHash = await hashPassword(rawPassword);

    await prisma.user.create({
      data: {
        email: emp.workEmail,
        passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: "EMPLOYEE",
        employeeId: emp.id,
        isActive: true,
      },
    });

    console.log(`✓ Created user for ${emp.firstName} ${emp.lastName} (${emp.workEmail}) — password: ${rawPassword}`);
  }

  console.log("\nDone! All employees now have user accounts.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
