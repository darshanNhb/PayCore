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
  const newEmail = "buddhdevdarshan1478@gmail.com";
  const newPasswordHash = await hashPassword("DB@#1478");

  // Find the existing admin
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  });

  if (admin) {
    // Update existing user
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        email: newEmail,
        passwordHash: newPasswordHash
      }
    });

    if (admin.employeeId) {
      await prisma.employee.update({
        where: { id: admin.employeeId },
        data: { workEmail: newEmail }
      });
    }

    console.log(`Updated existing admin to email: ${newEmail}`);
  } else {
    console.log("No admin found to update. Run seed first.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
