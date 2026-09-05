import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");

  // Seed Salary Structures
  const structures = [
    { name: "Indian CTC — Full Time", companyId: company.id },
    { name: "Indian CTC — Part Time", companyId: company.id },
    { name: "Intern Stipend", companyId: company.id },
    { name: "Contractor Monthly", companyId: company.id },
  ];

  for (const s of structures) {
    const exists = await prisma.salaryStructure.findFirst({ where: { name: s.name, companyId: s.companyId } });
    if (!exists) {
      await prisma.salaryStructure.create({ data: s });
      console.log(`Created salary structure: ${s.name}`);
    } else {
      console.log(`Salary structure already exists: ${s.name}`);
    }
  }

  // Seed Working Schedules
  const schedules = [
    { name: "Standard 40h (Mon–Fri)", companyId: company.id, timezone: "Asia/Kolkata", isDefault: true },
    { name: "Part Time 20h (Mon–Fri)", companyId: company.id, timezone: "Asia/Kolkata", isDefault: false },
    { name: "Flexible Hours", companyId: company.id, timezone: "Asia/Kolkata", isDefault: false },
  ];

  for (const ws of schedules) {
    const exists = await prisma.workingSchedule.findFirst({ where: { name: ws.name, companyId: ws.companyId } });
    if (!exists) {
      const schedule = await prisma.workingSchedule.create({ data: ws });

      // Add slots for Standard 40h
      if (ws.name === "Standard 40h (Mon–Fri)") {
        for (let day = 1; day <= 5; day++) {
          await prisma.workingScheduleSlot.create({
            data: {
              workingScheduleId: schedule.id,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "18:00",
              breakMinutes: 60,
            },
          });
        }
      }

      // Add slots for Part Time
      if (ws.name === "Part Time 20h (Mon–Fri)") {
        for (let day = 1; day <= 5; day++) {
          await prisma.workingScheduleSlot.create({
            data: {
              workingScheduleId: schedule.id,
              dayOfWeek: day,
              startTime: "10:00",
              endTime: "14:00",
              breakMinutes: 0,
            },
          });
        }
      }

      console.log(`Created working schedule: ${ws.name}`);
    } else {
      console.log(`Working schedule already exists: ${ws.name}`);
    }
  }

  console.log("Done seeding salary structures and working schedules.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
