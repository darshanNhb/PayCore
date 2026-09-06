import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const structures = await prisma.salaryStructure.findMany();
  
  console.log(`Found ${structures.length} salary structures.`);

  for (const structure of structures) {
    const existingRule = await prisma.salaryRule.findFirst({
      where: {
        salaryStructureId: structure.id,
        code: "OVERTIME_PAY"
      }
    });

    if (!existingRule) {
      await prisma.salaryRule.create({
        data: {
          salaryStructureId: structure.id,
          name: "Overtime Pay",
          code: "OVERTIME_PAY",
          category: "ALLOWANCE", // Adds to Gross
          sequence: 15, // Put it after Basic (10)
          computationMethod: "FORMULA",
          formulaExpression: "OVERTIME_HOURS * (BASIC / (TOTAL_WORKING_DAYS * 8)) * 1.5",
          appearsOnPayslip: true,
          active: true,
          isProrated: false // It's an exact hourly calculation, no proration
        }
      });
      console.log(`Added Overtime Pay rule to structure: ${structure.name}`);
    } else {
      console.log(`Overtime Pay rule already exists in structure: ${structure.name}`);
    }
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
