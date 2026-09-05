import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting Mass Seed...");
  
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");

  // Fetch existing reference data
  const departments = await prisma.department.findMany({ where: { deletedAt: null } });
  if (departments.length === 0) throw new Error("No departments found. Please create at least one department first.");

  const jobPositions = await prisma.jobPosition.findMany();
  if (jobPositions.length === 0) throw new Error("No job positions found. Please create at least one first.");

  const salaryStructures = await prisma.salaryStructure.findMany({ where: { status: "ACTIVE" } });
  if (salaryStructures.length === 0) throw new Error("No active salary structures found.");

  const workingSchedules = await prisma.workingSchedule.findMany({ where: { status: "ACTIVE" } });
  
  const timeOffTypes = await prisma.timeOffType.findMany({ where: { status: "ACTIVE" } });

  const numEmployeesToGenerate = 100;
  console.log(`Generating ${numEmployeesToGenerate} employees...`);

  const currentYear = new Date().getFullYear();
  const validFrom = new Date(currentYear, 0, 1);
  const validTo = new Date(currentYear, 11, 31);
  const passwordHash = await bcrypt.hash("password123", 10);

  let successCount = 0;
  
  // Get max employee code to increment
  let lastEmployee = await prisma.employee.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  let nextCodeNum = 100;
  if (lastEmployee?.employeeCode) {
    const match = lastEmployee.employeeCode.match(/(\d+)$/);
    if (match) nextCodeNum = parseInt(match[1]) + 1;
  }

  for (let i = 0; i < numEmployeesToGenerate; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const phone = faker.phone.number();
    
    // Pick random references
    const department = faker.helpers.arrayElement(departments);
    const position = faker.helpers.arrayElement(jobPositions);
    const schedule = workingSchedules.length > 0 ? faker.helpers.arrayElement(workingSchedules) : null;
    const structure = faker.helpers.arrayElement(salaryStructures);
    
    const employeeCode = `EMP/${currentYear}/${String(nextCodeNum++).padStart(4, "0")}`;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create Employee Profile FIRST
        const employee = await tx.employee.create({
          data: {
            companyId: company.id,
            employeeCode,
            firstName,
            lastName,
            workEmail: email,
            personalEmail: faker.internet.email(),
            phone,
            dateOfBirth: faker.date.birthdate({ min: 22, max: 60, mode: 'age' }),
            dateOfJoining: faker.date.past({ years: 3 }),
            departmentId: department.id,
            jobPositionId: position.id,
            workingScheduleId: schedule?.id,
            status: "ACTIVE",
            employeeType: faker.helpers.arrayElement(["FULL_TIME", "PART_TIME", "CONTRACT"]),
          }
        });

        // 2. Create User linked to Employee
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            phone,
            role: "EMPLOYEE",
            isActive: true,
            mustChangePassword: true,
            employeeId: employee.id
          }
        });

        // 3. Create Contract
        const wage = faker.number.int({ min: 30000, max: 150000 });
        const contractNumber = `CON/${currentYear}/${String(nextCodeNum).padStart(4, "0")}`;
        
        await tx.contract.create({
          data: {
            employeeId: employee.id,
            departmentId: department.id,
            jobPositionId: position.id,
            salaryStructureId: structure.id,
            workingScheduleId: schedule?.id,
            contractNumber,
            wagePerMonth: wage,
            startDate: employee.dateOfJoining,
            status: "RUNNING"
          }
        });

        // 4. Create Time Off Allocations
        if (timeOffTypes.length > 0) {
          for (const type of timeOffTypes) {
            if (type.requiresAllocation) {
              await tx.timeOffAllocation.create({
                data: {
                  employeeId: employee.id,
                  timeOffTypeId: type.id,
                  allocatedAmount: faker.number.int({ min: 5, max: 20 }),
                  validFrom,
                  validTo,
                  status: "APPROVED",
                }
              });
            }
          }
        }
      });

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Generated ${successCount}/${numEmployeesToGenerate} employees...`);
      }
    } catch (e) {
      console.error(`Failed to create employee ${email}:`, e);
      // continue to next
    }
  }

  console.log(`Successfully generated ${successCount} employees with their contracts and time off allocations!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
