import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting to seed additional departments and job positions...");

  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error("No company found to seed data for.");
  }

  const departmentsData = [
    { name: "Human Resources" },
    { name: "Engineering" },
    { name: "Sales" },
    { name: "Marketing" },
    { name: "Finance" },
    { name: "Customer Support" }
  ];

  const createdDepartments = {};

  for (const deptData of departmentsData) {
    const existing = await prisma.department.findUnique({
      where: { companyId_name: { companyId: company.id, name: deptData.name } }
    });
    if (existing) {
      createdDepartments[deptData.name] = existing.id;
    } else {
      const created = await prisma.department.create({
        data: {
          name: deptData.name,
          companyId: company.id,
        }
      });
      createdDepartments[deptData.name] = created.id;
    }
  }

  const jobPositionsData = [
    { title: "HR Specialist", departmentName: "Human Resources" },
    { title: "Payroll Manager", departmentName: "Human Resources" },
    { title: "Talent Acquisition Lead", departmentName: "Human Resources" },
    { title: "Software Engineer", departmentName: "Engineering" },
    { title: "Senior Software Engineer", departmentName: "Engineering" },
    { title: "Engineering Manager", departmentName: "Engineering" },
    { title: "QA Engineer", departmentName: "Engineering" },
    { title: "Sales Executive", departmentName: "Sales" },
    { title: "Account Manager", departmentName: "Sales" },
    { title: "VP of Sales", departmentName: "Sales" },
    { title: "Marketing Manager", departmentName: "Marketing" },
    { title: "Content Strategist", departmentName: "Marketing" },
    { title: "SEO Specialist", departmentName: "Marketing" },
    { title: "Accountant", departmentName: "Finance" },
    { title: "Financial Analyst", departmentName: "Finance" },
    { title: "Chief Financial Officer (CFO)", departmentName: "Finance" },
    { title: "Support Representative", departmentName: "Customer Support" },
    { title: "Customer Success Manager", departmentName: "Customer Support" }
  ];

  let addedCount = 0;
  for (const posData of jobPositionsData) {
    const deptId = createdDepartments[posData.departmentName];
    // Check if exists
    const existing = await prisma.jobPosition.findFirst({
      where: { companyId: company.id, title: posData.title, departmentId: deptId }
    });
    
    if (!existing) {
      await prisma.jobPosition.create({
        data: {
          title: posData.title,
          companyId: company.id,
          departmentId: deptId
        }
      });
      addedCount++;
    }
  }

  console.log(`Added departments and ${addedCount} new job positions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
