import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRichData() {
  console.log("Seeding rich operational demo data...");

  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found! Run initial seed first.");
    return;
  }

  // 1. Working Schedule
  let schedule = await prisma.workingSchedule.findFirst({
    where: { companyId: company.id }
  });
  if (!schedule) {
    schedule = await prisma.workingSchedule.create({
      data: {
        companyId: company.id,
        name: "Standard Indian Tech (Mon-Fri 40h)",
        timezone: "Asia/Kolkata",
        isDefault: true,
        slots: {
          create: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
            { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
            { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
            { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
            { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
          ]
        }
      }
    });
    console.log("Created Working Schedule:", schedule.name);
  }

  // 2. Leave Types
  const leaveTypes = [
    { name: "Paid Privilege Leave", colorTag: "#10B981" },
    { name: "Casual Leave", colorTag: "#3B82F6" },
    { name: "Sick Leave", colorTag: "#F59E0B" },
  ];

  for (const lt of leaveTypes) {
    const existing = await prisma.timeOffType.findFirst({
      where: { companyId: company.id, name: lt.name }
    });
    if (!existing) {
      await prisma.timeOffType.create({
        data: {
          companyId: company.id,
          name: lt.name,
          colorTag: lt.colorTag,
          requiresApproval: true,
          requiresAllocation: true,
          affectsPayroll: true,
        }
      });
      console.log("Created Leave Type:", lt.name);
    }
  }

  // 3. Salary Structure and Rules
  let structure = await prisma.salaryStructure.findFirst({
    where: { companyId: company.id },
    include: { rules: true }
  });

  if (!structure) {
    structure = await prisma.salaryStructure.create({
      data: {
        companyId: company.id,
        name: "Standard Indian Corporate Structure",
        description: "Standard CTC distribution with Basic, HRA, EPF, and PT",
        rules: {
          create: [
            {
              name: "Basic Salary",
              code: "BASIC",
              category: "BASIC",
              sequence: 10,
              computationMethod: "PERCENTAGE_OF_RULE",
              percentageValue: 50,
              percentageOfRuleCode: "WAGE",
            },
            {
              name: "House Rent Allowance",
              code: "HRA",
              category: "ALLOWANCE",
              sequence: 20,
              computationMethod: "PERCENTAGE_OF_RULE",
              percentageValue: 50,
              percentageOfRuleCode: "BASIC",
            },
            {
              name: "Special Allowance",
              code: "SPECIAL",
              category: "ALLOWANCE",
              sequence: 30,
              computationMethod: "FORMULA",
              formulaExpression: "WAGE - (BASIC + HRA)",
            },
            {
              name: "Employee Provident Fund",
              code: "EPF",
              category: "DEDUCTION",
              sequence: 40,
              computationMethod: "PERCENTAGE_OF_RULE",
              percentageValue: 12,
              percentageOfRuleCode: "BASIC",
            },
            {
              name: "Professional Tax",
              code: "PT",
              category: "DEDUCTION",
              sequence: 50,
              computationMethod: "FIXED_AMOUNT",
              fixedAmount: 200,
            }
          ]
        }
      },
      include: { rules: true }
    });
    console.log("Created Salary Structure with Rules:", structure.name);
  }

  // 4. Link Employee Aarav Mehta to Contract and Structure
  const aarav = await prisma.employee.findUnique({
    where: { workEmail: "aarav.mehta@paycore.in" },
    include: { contracts: true }
  });

  if (aarav) {
    const dept = await prisma.department.findFirst({ where: { companyId: company.id } });
    const pos = await prisma.jobPosition.findFirst({ where: { companyId: company.id } });

    let contract = aarav.contracts[0];
    if (!contract) {
      contract = await prisma.contract.create({
        data: {
          employeeId: aarav.id,
          contractNumber: "CNT-2026-001",
          wagePerMonth: 85000,
          startDate: new Date("2026-01-15"),
          status: "RUNNING",
          salaryStructureId: structure.id,
          workingScheduleId: schedule.id,
          departmentId: dept?.id,
          jobPositionId: pos?.id,
        }
      });
      console.log("Created Running Contract for Aarav Mehta: ₹85,000/mo");
    }

    const existingPayslip = await prisma.payslip.findFirst({
      where: { employeeId: aarav.id }
    });

    if (!existingPayslip) {
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      const payrun = await prisma.payrun.create({
        data: {
          companyId: company.id,
          salaryStructureId: structure.id,
          createdByUserId: adminUser.id,
          name: "Payrun - February 2026",
          periodStart: new Date("2026-02-01"),
          periodEnd: new Date("2026-02-28"),
          paidAt: new Date("2026-02-28"),
          status: "PAID",
        }
      });

      const basic = 42500;
      const hra = 21250;
      const special = 21250;
      const epf = 5100;
      const pt = 200;
      const gross = basic + hra + special;
      const deductions = epf + pt;
      const net = gross - deductions;

      const ruleBasic = structure.rules.find(r => r.code === "BASIC") || structure.rules[0];
      const ruleHra = structure.rules.find(r => r.code === "HRA") || structure.rules[0];
      const ruleSpecial = structure.rules.find(r => r.code === "SPECIAL") || structure.rules[0];
      const ruleEpf = structure.rules.find(r => r.code === "EPF") || structure.rules[0];
      const rulePt = structure.rules.find(r => r.code === "PT") || structure.rules[0];

      const payslip = await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: aarav.id,
          contractId: contract.id,
          salaryStructureId: structure.id,
          periodStart: new Date("2026-02-01"),
          periodEnd: new Date("2026-02-28"),
          workedDays: 20,
          totalWorkingDays: 20,
          unpaidLeaveDays: 0,
          grossAmount: gross,
          totalDeductions: deductions,
          netAmount: net,
          status: "PAID",
          lines: {
            create: [
              { salaryRuleId: ruleBasic.id, ruleCode: "BASIC", ruleName: "Basic Salary", category: "BASIC", sequence: 10, amount: basic },
              { salaryRuleId: ruleHra.id, ruleCode: "HRA", ruleName: "House Rent Allowance", category: "ALLOWANCE", sequence: 20, amount: hra },
              { salaryRuleId: ruleSpecial.id, ruleCode: "SPECIAL", ruleName: "Special Allowance", category: "ALLOWANCE", sequence: 30, amount: special },
              { salaryRuleId: ruleEpf.id, ruleCode: "EPF", ruleName: "Employee Provident Fund", category: "DEDUCTION", sequence: 40, amount: epf },
              { salaryRuleId: rulePt.id, ruleCode: "PT", ruleName: "Professional Tax", category: "DEDUCTION", sequence: 50, amount: pt },
            ]
          }
        }
      });
      console.log("Created Verified Sample Payslip:", payslip.id, "Net Pay: ₹", net);
    }
  }

  console.log("Rich Operational Data Seeding Complete!");
}

seedRichData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
