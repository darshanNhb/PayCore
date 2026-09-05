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
  console.log("Starting Future Employees Seed (50 employees)...");

  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");

  const departments = await prisma.department.findMany({ where: { deletedAt: null } });
  const jobPositions = await prisma.jobPosition.findMany();
  const salaryStructures = await prisma.salaryStructure.findMany({ where: { status: "ACTIVE" } });
  const workingSchedules = await prisma.workingSchedule.findMany({ where: { status: "ACTIVE" } });
  const timeOffTypes = await prisma.timeOffType.findMany({ where: { status: "ACTIVE" } });

  if (!departments.length || !jobPositions.length || !salaryStructures.length) {
    throw new Error("Missing reference data (departments, positions, or structures)");
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const currentYear = new Date().getFullYear();

  // Find the next available employee code number
  const allEmployees = await prisma.employee.findMany({ select: { employeeCode: true } });
  let maxCode = 200;
  for (const e of allEmployees) {
    const match = e.employeeCode.match(/(\d+)$/);
    if (match) maxCode = Math.max(maxCode, parseInt(match[1]));
  }
  let nextCode = maxCode + 1;

  // Future months: Oct 2026, Nov 2026, Dec 2026, Jan 2027, Feb 2027
  const futureMonths = [
    { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31), label: "Oct 2026" },
    { start: new Date(2026, 10, 1), end: new Date(2026, 10, 30), label: "Nov 2026" },
    { start: new Date(2026, 11, 1), end: new Date(2026, 11, 31), label: "Dec 2026" },
    { start: new Date(2027, 0, 1), end: new Date(2027, 0, 31), label: "Jan 2027" },
    { start: new Date(2027, 1, 1), end: new Date(2027, 1, 28), label: "Feb 2027" },
  ];

  const validFrom = new Date(currentYear, 0, 1);
  const validTo = new Date(currentYear, 11, 31);

  let successCount = 0;

  for (let i = 0; i < 50; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const phone = faker.phone.number();

    const department = faker.helpers.arrayElement(departments);
    const position = faker.helpers.arrayElement(jobPositions);
    const schedule = workingSchedules.length > 0 ? faker.helpers.arrayElement(workingSchedules) : null;
    const structure = faker.helpers.arrayElement(salaryStructures);

    const employeeCode = `EMP/${currentYear}/${String(nextCode++).padStart(4, "0")}`;
    // Contract starts in a random future month
    const futureMonth = faker.helpers.arrayElement(futureMonths);

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create Employee
        const employee = await tx.employee.create({
          data: {
            companyId: company.id,
            employeeCode,
            firstName,
            lastName,
            workEmail: email,
            personalEmail: faker.internet.email(),
            phone,
            dateOfBirth: faker.date.birthdate({ min: 22, max: 55, mode: "age" }),
            dateOfJoining: futureMonth.start, // joins in that future month
            departmentId: department.id,
            jobPositionId: position.id,
            workingScheduleId: schedule?.id,
            status: "ACTIVE",
            employeeType: faker.helpers.arrayElement(["FULL_TIME", "PART_TIME", "CONTRACT"]),
          },
        });

        // 2. Create User
        await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            phone,
            role: "EMPLOYEE",
            isActive: true,
            mustChangePassword: true,
            employeeId: employee.id,
          },
        });

        // 3. Create Contract starting in a future month (RUNNING status so it's picked up by payruns)
        const wage = faker.number.int({ min: 35000, max: 180000 });
        const contractNumber = `CON/${currentYear}/${String(nextCode).padStart(4, "0")}`;

        await tx.contract.create({
          data: {
            employeeId: employee.id,
            departmentId: department.id,
            jobPositionId: position.id,
            salaryStructureId: structure.id,
            workingScheduleId: schedule?.id,
            contractNumber,
            wagePerMonth: wage,
            startDate: futureMonth.start,
            status: "RUNNING",
          },
        });

        // 4. Time Off Allocations
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
              },
            });
          }
        }
      });

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Created ${successCount}/50 future employees...`);
      }
    } catch (e: any) {
      console.error(`Failed ${email}:`, e.message);
    }
  }

  console.log(`\nDone! Created ${successCount} employees with future-month contracts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
