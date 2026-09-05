import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const structures = await prisma.salaryStructure.findMany();
  
  if (structures.length === 0) {
    console.log("No salary structures found. Please create one first.");
    return;
  }

  for (const s of structures) {
    console.log(`Seeding rules for structure: ${s.name}`);

    // Clean existing rules for this structure
    await prisma.salaryRule.deleteMany({ where: { salaryStructureId: s.id } });

    let rulesToCreate: any[] = [];

    if (s.name.includes("Full Time")) {
      rulesToCreate = [
        { name: "Basic Salary", code: "BASIC", category: "BASIC", sequence: 10, computationMethod: "FIXED_AMOUNT", fixedAmount: 50000, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "House Rent Allowance", code: "HRA", category: "ALLOWANCE", sequence: 20, computationMethod: "PERCENTAGE_OF_RULE", percentageOfRuleCode: "BASIC", percentageValue: 50, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Conveyance Allowance", code: "CA", category: "ALLOWANCE", sequence: 30, computationMethod: "FIXED_AMOUNT", fixedAmount: 1600, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Gross Salary", code: "GROSS", category: "GROSS", sequence: 100, computationMethod: "FORMULA", formulaExpression: "BASIC + HRA + CA", appearsOnPayslip: true, active: true, isProrated: false },
        { name: "Provident Fund", code: "PF", category: "DEDUCTION", sequence: 110, computationMethod: "PERCENTAGE_OF_RULE", percentageOfRuleCode: "BASIC", percentageValue: 12, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Professional Tax", code: "PT", category: "DEDUCTION", sequence: 120, computationMethod: "FIXED_AMOUNT", fixedAmount: 200, appearsOnPayslip: true, active: true, isProrated: false },
        { name: "Net Pay", code: "NET", category: "NET", sequence: 200, computationMethod: "FORMULA", formulaExpression: "GROSS - PF - PT", appearsOnPayslip: true, active: true, isProrated: false }
      ];
    } else if (s.name.includes("Part Time")) {
      rulesToCreate = [
        { name: "Basic Salary", code: "BASIC", category: "BASIC", sequence: 10, computationMethod: "FIXED_AMOUNT", fixedAmount: 25000, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Conveyance Allowance", code: "CA", category: "ALLOWANCE", sequence: 30, computationMethod: "FIXED_AMOUNT", fixedAmount: 800, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Gross Salary", code: "GROSS", category: "GROSS", sequence: 100, computationMethod: "FORMULA", formulaExpression: "BASIC + CA", appearsOnPayslip: true, active: true, isProrated: false },
        { name: "Professional Tax", code: "PT", category: "DEDUCTION", sequence: 120, computationMethod: "FIXED_AMOUNT", fixedAmount: 150, appearsOnPayslip: true, active: true, isProrated: false },
        { name: "Net Pay", code: "NET", category: "NET", sequence: 200, computationMethod: "FORMULA", formulaExpression: "GROSS - PT", appearsOnPayslip: true, active: true, isProrated: false }
      ];
    } else if (s.name.includes("Contractor")) {
      rulesToCreate = [
        { name: "Professional Fees", code: "FEES", category: "BASIC", sequence: 10, computationMethod: "FIXED_AMOUNT", fixedAmount: 60000, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Gross Fees", code: "GROSS", category: "GROSS", sequence: 100, computationMethod: "FORMULA", formulaExpression: "FEES", appearsOnPayslip: true, active: true, isProrated: false },
        { name: "TDS (10%)", code: "TDS", category: "DEDUCTION", sequence: 110, computationMethod: "PERCENTAGE_OF_RULE", percentageOfRuleCode: "FEES", percentageValue: 10, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Net Payable", code: "NET", category: "NET", sequence: 200, computationMethod: "FORMULA", formulaExpression: "GROSS - TDS", appearsOnPayslip: true, active: true, isProrated: false }
      ];
    } else if (s.name.includes("Intern")) {
      rulesToCreate = [
        { name: "Monthly Stipend", code: "STIPEND", category: "BASIC", sequence: 10, computationMethod: "FIXED_AMOUNT", fixedAmount: 15000, appearsOnPayslip: true, active: true, isProrated: true },
        { name: "Gross Stipend", code: "GROSS", category: "GROSS", sequence: 100, computationMethod: "FORMULA", formulaExpression: "STIPEND", appearsOnPayslip: true, active: true, isProrated: false },
        { name: "Net Stipend", code: "NET", category: "NET", sequence: 200, computationMethod: "FORMULA", formulaExpression: "GROSS", appearsOnPayslip: true, active: true, isProrated: false }
      ];
    }

    for (const rule of rulesToCreate) {
      await prisma.salaryRule.create({ data: { ...rule, salaryStructureId: s.id } as any });
    }
  }

  console.log("Seeding rules complete!");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
