import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import * as dotenv from "dotenv";

async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

function getEncKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) return Buffer.from(envKey, "hex");
    return crypto.createHash("sha256").update(envKey).digest();
  }
  return crypto.createHash("sha256").update("paycore-default-encryption-key-v1").digest();
}

function encryptField(plainText: string | null | undefined): string | null {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Wiping old data (keeping schema intact)...");

  // Delete in dependency order (children first)
  await prisma.payslipLine.deleteMany();
  await prisma.payslipWarning.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.workingScheduleSlot.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  console.log("✅ Database wiped.");

  // ─── COMPANY ───
  const company = await prisma.company.create({
    data: { name: "PayCore India Pvt. Ltd.", legalName: "PayCore Technologies India Private Limited", timezone: "Asia/Kolkata", currency: "INR" },
  });
  console.log("🏢 Company created.");

  // ─── DEPARTMENTS ───
  const deptEng = await prisma.department.create({ data: { name: "Engineering", companyId: company.id } });
  const deptSales = await prisma.department.create({ data: { name: "Sales & Marketing", companyId: company.id } });
  const deptHR = await prisma.department.create({ data: { name: "Human Resources", companyId: company.id } });
  const deptFinance = await prisma.department.create({ data: { name: "Finance", companyId: company.id } });
  const deptAdmin = await prisma.department.create({ data: { name: "Administration", companyId: company.id } });
  console.log("📁 5 Departments created.");

  // ─── JOB POSITIONS ───
  const posSysAdmin = await prisma.jobPosition.create({ data: { title: "System Administrator", departmentId: deptAdmin.id, companyId: company.id } });
  const posSeniorDev = await prisma.jobPosition.create({ data: { title: "Senior Software Engineer", departmentId: deptEng.id, companyId: company.id } });
  const posJuniorDev = await prisma.jobPosition.create({ data: { title: "Junior Software Engineer", departmentId: deptEng.id, companyId: company.id } });
  const posQA = await prisma.jobPosition.create({ data: { title: "QA Engineer", departmentId: deptEng.id, companyId: company.id } });
  const posAccExec = await prisma.jobPosition.create({ data: { title: "Account Executive", departmentId: deptSales.id, companyId: company.id } });
  const posMktMgr = await prisma.jobPosition.create({ data: { title: "Marketing Manager", departmentId: deptSales.id, companyId: company.id } });
  const posHRMgr = await prisma.jobPosition.create({ data: { title: "HR Manager", departmentId: deptHR.id, companyId: company.id } });
  const posAcct = await prisma.jobPosition.create({ data: { title: "Accountant", departmentId: deptFinance.id, companyId: company.id } });
  const posIntern = await prisma.jobPosition.create({ data: { title: "Engineering Intern", departmentId: deptEng.id, companyId: company.id } });
  console.log("💼 9 Job Positions created.");

  // ─── WORKING SCHEDULES ───
  const schedFull = await prisma.workingSchedule.create({ data: { name: "India — Standard 40h", companyId: company.id, isDefault: true, status: "ACTIVE" } });
  const schedPart = await prisma.workingSchedule.create({ data: { name: "India — Part Time 20h", companyId: company.id, isDefault: false, status: "ACTIVE" } });

  // Full time slots: Mon-Fri 9:00-17:00 with 60 min break
  for (let day = 1; day <= 5; day++) {
    await prisma.workingScheduleSlot.create({ data: { workingScheduleId: schedFull.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00", breakMinutes: 60 } });
  }
  // Part time slots: Mon-Fri 10:00-14:00
  for (let day = 1; day <= 5; day++) {
    await prisma.workingScheduleSlot.create({ data: { workingScheduleId: schedPart.id, dayOfWeek: day, startTime: "10:00", endTime: "14:00", breakMinutes: 0 } });
  }
  console.log("🕐 2 Working Schedules created.");

  // ─── SALARY STRUCTURES ───
  const structFullTime = await prisma.salaryStructure.create({ data: { name: "Indian CTC — Full Time", companyId: company.id, status: "ACTIVE" } });
  const structIntern = await prisma.salaryStructure.create({ data: { name: "Intern Stipend", companyId: company.id, status: "ACTIVE" } });

  // Rules for Full Time
  const ftRules = [
    { name: "Basic Salary", code: "BASIC", category: "BASIC" as const, sequence: 10, computationMethod: "PERCENTAGE_OF_RULE" as const, percentageOfRuleCode: null, percentageValue: null, fixedAmount: null, formulaExpression: null, isProrated: true },
    { name: "HRA", code: "HRA", category: "ALLOWANCE" as const, sequence: 20, computationMethod: "PERCENTAGE_OF_RULE" as const, percentageOfRuleCode: "BASIC", percentageValue: 40, fixedAmount: null, formulaExpression: null, isProrated: true },
    { name: "Overtime Pay", code: "OVERTIME_PAY", category: "ALLOWANCE" as const, sequence: 25, computationMethod: "FORMULA" as const, percentageOfRuleCode: null, percentageValue: null, fixedAmount: null, formulaExpression: "OVERTIME_HOURS * (BASIC / (TOTAL_WORKING_DAYS * 8)) * 1.5", isProrated: false },
    { name: "Gross Pay", code: "GROSS", category: "GROSS" as const, sequence: 50, computationMethod: "FORMULA" as const, percentageOfRuleCode: null, percentageValue: null, fixedAmount: null, formulaExpression: "BASIC + HRA + OVERTIME_PAY", isProrated: false },
    { name: "Provident Fund (Employee)", code: "PF_EE", category: "DEDUCTION" as const, sequence: 60, computationMethod: "PERCENTAGE_OF_RULE" as const, percentageOfRuleCode: "BASIC", percentageValue: 12, fixedAmount: null, formulaExpression: null, isProrated: false },
    { name: "Professional Tax", code: "PT", category: "DEDUCTION" as const, sequence: 70, computationMethod: "FIXED_AMOUNT" as const, percentageOfRuleCode: null, percentageValue: null, fixedAmount: 200, formulaExpression: null, isProrated: false },
    { name: "Net Pay", code: "NET", category: "NET" as const, sequence: 100, computationMethod: "FORMULA" as const, percentageOfRuleCode: null, percentageValue: null, fixedAmount: null, formulaExpression: "GROSS - PF_EE - PT", isProrated: false },
    { name: "Provident Fund (Employer)", code: "PF_ER", category: "EMPLOYER_CONTRIBUTION" as const, sequence: 110, computationMethod: "PERCENTAGE_OF_RULE" as const, percentageOfRuleCode: "BASIC", percentageValue: 12, fixedAmount: null, formulaExpression: null, isProrated: false },
  ];

  for (const r of ftRules) {
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structFullTime.id,
        name: r.name,
        code: r.code,
        category: r.category,
        sequence: r.sequence,
        computationMethod: r.computationMethod,
        fixedAmount: r.fixedAmount,
        percentageOfRuleCode: r.percentageOfRuleCode,
        percentageValue: r.percentageValue,
        formulaExpression: r.formulaExpression,
        appearsOnPayslip: true,
        active: true,
        isProrated: r.isProrated,
      },
    });
  }

  // Rules for Intern
  const internRules = [
    { name: "Stipend", code: "BASIC", category: "BASIC" as const, sequence: 10, computationMethod: "PERCENTAGE_OF_RULE" as const, isProrated: true },
    { name: "Overtime Pay", code: "OVERTIME_PAY", category: "ALLOWANCE" as const, sequence: 25, computationMethod: "FORMULA" as const, formulaExpression: "OVERTIME_HOURS * (BASIC / (TOTAL_WORKING_DAYS * 8)) * 1.5", isProrated: false },
    { name: "Gross Pay", code: "GROSS", category: "GROSS" as const, sequence: 50, computationMethod: "FORMULA" as const, formulaExpression: "BASIC + OVERTIME_PAY", isProrated: false },
    { name: "Net Pay", code: "NET", category: "NET" as const, sequence: 100, computationMethod: "FORMULA" as const, formulaExpression: "GROSS", isProrated: false },
  ];

  for (const r of internRules) {
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structIntern.id,
        name: r.name,
        code: r.code,
        category: r.category,
        sequence: r.sequence,
        computationMethod: r.computationMethod,
        formulaExpression: r.formulaExpression || null,
        appearsOnPayslip: true,
        active: true,
        isProrated: r.isProrated,
      },
    });
  }
  console.log("💰 2 Salary Structures with rules created.");

  // ─── TIME OFF TYPES ───
  const toEarned = await prisma.timeOffType.create({ data: { name: "Earned Leave", companyId: company.id, unit: "DAYS", requiresAllocation: true, requiresApproval: true, affectsPayroll: true, colorTag: "blue", status: "ACTIVE" } });
  const toSick = await prisma.timeOffType.create({ data: { name: "Sick Leave", companyId: company.id, unit: "DAYS", requiresAllocation: true, requiresApproval: true, affectsPayroll: false, colorTag: "red", status: "ACTIVE" } });
  const toUnpaid = await prisma.timeOffType.create({ data: { name: "Unpaid Leave", companyId: company.id, unit: "DAYS", requiresAllocation: false, requiresApproval: true, affectsPayroll: true, colorTag: "gray", status: "ACTIVE" } });
  console.log("🏖️  3 Time Off Types created.");

  // ─── EMPLOYEES ───
  const avatarColors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
    "bg-lime-100 text-lime-700",
  ];

  const employeeDefs = [
    { firstName: "Darshan", lastName: "Admin", email: "buddhdevdarshan1478@gmail.com", code: "EMP001", dept: deptAdmin.id, pos: posSysAdmin.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2026-01-01", wage: 150000, bank: true, sched: schedFull.id },
    { firstName: "Aarav", lastName: "Sharma", email: "aarav.sharma@paycore.in", code: "EMP002", dept: deptEng.id, pos: posSeniorDev.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2025-06-15", wage: 120000, bank: true, sched: schedFull.id },
    { firstName: "Priya", lastName: "Patel", email: "priya.patel@paycore.in", code: "EMP003", dept: deptEng.id, pos: posJuniorDev.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2026-03-10", wage: 65000, bank: true, sched: schedFull.id },
    { firstName: "Vikram", lastName: "Mehta", email: "vikram.mehta@paycore.in", code: "EMP004", dept: deptEng.id, pos: posQA.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2025-11-01", wage: 70000, bank: false, sched: schedFull.id },
    { firstName: "Neha", lastName: "Gupta", email: "neha.gupta@paycore.in", code: "EMP005", dept: deptSales.id, pos: posAccExec.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2026-01-20", wage: 80000, bank: true, sched: schedFull.id },
    { firstName: "Rohan", lastName: "Singh", email: "rohan.singh@paycore.in", code: "EMP006", dept: deptSales.id, pos: posMktMgr.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2025-09-01", wage: 95000, bank: true, sched: schedFull.id },
    { firstName: "Ananya", lastName: "Desai", email: "ananya.desai@paycore.in", code: "EMP007", dept: deptHR.id, pos: posHRMgr.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2025-04-15", wage: 100000, bank: true, sched: schedFull.id },
    { firstName: "Kiran", lastName: "Rao", email: "kiran.rao@paycore.in", code: "EMP008", dept: deptFinance.id, pos: posAcct.id, status: "ACTIVE" as const, type: "FULL_TIME" as const, doj: "2026-02-01", wage: 75000, bank: false, sched: schedFull.id },
    { firstName: "Arjun", lastName: "Nair", email: "arjun.nair@paycore.in", code: "EMP009", dept: deptEng.id, pos: posIntern.id, status: "ACTIVE" as const, type: "INTERN" as const, doj: "2026-07-01", wage: 25000, bank: true, sched: schedPart.id },
    { firstName: "Meera", lastName: "Joshi", email: "meera.joshi@paycore.in", code: "EMP010", dept: deptEng.id, pos: posJuniorDev.id, status: "ON_LEAVE" as const, type: "FULL_TIME" as const, doj: "2026-04-01", wage: 60000, bank: true, sched: schedFull.id },
    { firstName: "Siddharth", lastName: "Kumar", email: "siddharth.kumar@paycore.in", code: "EMP011", dept: deptSales.id, pos: posAccExec.id, status: "INACTIVE" as const, type: "FULL_TIME" as const, doj: "2025-08-01", wage: 55000, bank: false, sched: schedFull.id },
  ];

  const employees: any[] = [];
  const passwordHash = await hashPassword("DB@#1478");

  for (let i = 0; i < employeeDefs.length; i++) {
    const def = employeeDefs[i];
    const emp = await prisma.employee.create({
      data: {
        firstName: def.firstName,
        lastName: def.lastName,
        workEmail: def.email,
        employeeCode: def.code,
        departmentId: def.dept,
        jobPositionId: def.pos,
        companyId: company.id,
        dateOfJoining: new Date(def.doj),
        status: def.status,
        employeeType: def.type,
        workingScheduleId: def.sched,
        avatarColor: avatarColors[i % avatarColors.length],
        bankAccountNumberEncrypted: def.bank ? encryptField("1234567890" + i) : null,
        bankIfscEncrypted: def.bank ? encryptField("SBIN000" + (1000 + i)) : null,
        bankVerified: def.bank,
        panEncrypted: encryptField("ABCDE" + (1234 + i) + "F"),
        managerId: null, // will set after
      },
    });
    employees.push({ ...emp, wage: def.wage, structId: def.type === "INTERN" ? structIntern.id : structFullTime.id });
  }

  // Set manager hierarchy: Aarav (Senior Dev) manages Priya, Vikram, Arjun, Meera
  await prisma.employee.update({ where: { id: employees[2].id }, data: { managerId: employees[1].id } }); // Priya -> Aarav
  await prisma.employee.update({ where: { id: employees[3].id }, data: { managerId: employees[1].id } }); // Vikram -> Aarav
  await prisma.employee.update({ where: { id: employees[8].id }, data: { managerId: employees[1].id } }); // Arjun -> Aarav
  await prisma.employee.update({ where: { id: employees[9].id }, data: { managerId: employees[1].id } }); // Meera -> Aarav
  // Rohan -> Neha (Marketing Manager manages Account Exec)
  await prisma.employee.update({ where: { id: employees[4].id }, data: { managerId: employees[5].id } }); // Neha -> Rohan

  // Set department managers
  await prisma.department.update({ where: { id: deptEng.id }, data: { managerEmployeeId: employees[1].id } });
  await prisma.department.update({ where: { id: deptSales.id }, data: { managerEmployeeId: employees[5].id } });
  await prisma.department.update({ where: { id: deptHR.id }, data: { managerEmployeeId: employees[6].id } });
  await prisma.department.update({ where: { id: deptFinance.id }, data: { managerEmployeeId: employees[7].id } });

  console.log("👥 11 Employees created with hierarchy.");

  // ─── USERS (login accounts for admin + a few employees) ───
  // Admin user
  await prisma.user.create({
    data: {
      email: "buddhdevdarshan1478@gmail.com",
      passwordHash,
      firstName: "Darshan",
      lastName: "Admin",
      role: "ADMIN",
      employeeId: employees[0].id,
      isActive: true,
    },
  });
  // HR Manager
  await prisma.user.create({
    data: {
      email: "ananya.desai@paycore.in",
      passwordHash: await hashPassword("PayCore@123"),
      firstName: "Ananya",
      lastName: "Desai",
      role: "HR_PAYROLL_MANAGER",
      employeeId: employees[6].id,
      isActive: true,
    },
  });
  // Regular employee
  await prisma.user.create({
    data: {
      email: "priya.patel@paycore.in",
      passwordHash: await hashPassword("PayCore@123"),
      firstName: "Priya",
      lastName: "Patel",
      role: "EMPLOYEE",
      employeeId: employees[2].id,
      isActive: true,
    },
  });
  console.log("🔑 3 User logins created.");

  // ─── CONTRACTS ───
  for (const emp of employees) {
    // Skip inactive employee - they don't have a running contract
    const status = emp.status === "INACTIVE" ? "EXPIRED" : "RUNNING";
    await prisma.contract.create({
      data: {
        employeeId: emp.id,
        contractNumber: `CON/2026/${emp.employeeCode.replace("EMP", "")}`,
        departmentId: emp.departmentId,
        jobPositionId: emp.jobPositionId,
        salaryStructureId: emp.structId,
        wagePerMonth: emp.wage,
        startDate: new Date(emp.dateOfJoining),
        status,
        workingScheduleId: emp.workingScheduleId,
      },
    });
  }
  console.log("📝 11 Contracts created.");

  // ─── TIME OFF ALLOCATIONS ───
  // Give Earned Leave (20 days) and Sick Leave (10 days) to all active employees
  for (const emp of employees) {
    if (emp.status === "INACTIVE") continue;
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: toEarned.id,
        allocatedAmount: 20,
        takenAmount: 0,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "APPROVED",
        approvedAt: new Date("2026-01-01"),
      },
    });
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: toSick.id,
        allocatedAmount: 10,
        takenAmount: 0,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "APPROVED",
        approvedAt: new Date("2026-01-01"),
      },
    });
  }
  console.log("📋 Time Off Allocations created.");

  // ─── TIME OFF REQUESTS ───
  // Priya: Approved 3-day earned leave in Aug (taken from balance)
  const priyaAlloc = await prisma.timeOffAllocation.findFirst({ where: { employeeId: employees[2].id, timeOffTypeId: toEarned.id } });
  await prisma.timeOffRequest.create({
    data: {
      employeeId: employees[2].id,
      timeOffTypeId: toEarned.id,
      allocationId: priyaAlloc?.id,
      startDate: new Date("2026-08-18"),
      endDate: new Date("2026-08-20"),
      durationAmount: 3,
      reason: "Family function in Ahmedabad",
      status: "APPROVED",
      decidedAt: new Date("2026-08-15"),
    },
  });
  if (priyaAlloc) await prisma.timeOffAllocation.update({ where: { id: priyaAlloc.id }, data: { takenAmount: 3 } });

  // Vikram: Approved 2-day sick leave in Aug
  const vikramSickAlloc = await prisma.timeOffAllocation.findFirst({ where: { employeeId: employees[3].id, timeOffTypeId: toSick.id } });
  await prisma.timeOffRequest.create({
    data: {
      employeeId: employees[3].id,
      timeOffTypeId: toSick.id,
      allocationId: vikramSickAlloc?.id,
      startDate: new Date("2026-08-25"),
      endDate: new Date("2026-08-26"),
      durationAmount: 2,
      reason: "Fever and doctor visit",
      status: "APPROVED",
      decidedAt: new Date("2026-08-24"),
    },
  });
  if (vikramSickAlloc) await prisma.timeOffAllocation.update({ where: { id: vikramSickAlloc.id }, data: { takenAmount: 2 } });

  // Meera: On Leave — Approved 15-day earned leave (she only has 20, so this is fine)
  const meeraAlloc = await prisma.timeOffAllocation.findFirst({ where: { employeeId: employees[9].id, timeOffTypeId: toEarned.id } });
  await prisma.timeOffRequest.create({
    data: {
      employeeId: employees[9].id,
      timeOffTypeId: toEarned.id,
      allocationId: meeraAlloc?.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-19"),
      durationAmount: 15,
      reason: "Personal / maternity preparation",
      status: "APPROVED",
      decidedAt: new Date("2026-08-28"),
    },
  });
  if (meeraAlloc) await prisma.timeOffAllocation.update({ where: { id: meeraAlloc.id }, data: { takenAmount: 15 } });

  // Neha: Pending leave request for Oct
  await prisma.timeOffRequest.create({
    data: {
      employeeId: employees[4].id,
      timeOffTypeId: toEarned.id,
      startDate: new Date("2026-10-14"),
      endDate: new Date("2026-10-17"),
      durationAmount: 4,
      reason: "Diwali vacation with family",
      status: "TO_APPROVE",
    },
  });

  // Rohan: Refused leave request
  await prisma.timeOffRequest.create({
    data: {
      employeeId: employees[5].id,
      timeOffTypeId: toEarned.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-10"),
      durationAmount: 8,
      reason: "Extended holiday",
      status: "REFUSED",
      decisionNote: "Q3 sales quarter close — staffing required",
      decidedAt: new Date("2026-08-29"),
    },
  });

  console.log("🏖️  5 Time Off Requests created (3 approved, 1 pending, 1 refused).");

  // ─── ATTENDANCE RECORDS ───
  // Seed 2 weeks of attendance for the active full-time employees
  const activeFullTimeEmps = employees.filter((e: any) => e.status === "ACTIVE" && e.employeeType !== "INTERN");

  const attendanceStart = new Date("2026-08-25"); // Monday
  const attendanceEnd = new Date("2026-09-05"); // Friday

  for (const emp of activeFullTimeEmps) {
    const current = new Date(attendanceStart);
    while (current <= attendanceEnd) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dateStr = current.toISOString().split("T")[0];
      let checkInHour = 9;
      let checkInMin = 0;
      let checkOutHour = 17;
      let checkOutMin = 0;

      // Aarav (Senior Dev) works overtime on some days
      if (emp.id === employees[1].id && (dayOfWeek === 2 || dayOfWeek === 4)) {
        checkOutHour = 21; // Stays till 9 PM — 4 hours overtime
        checkOutMin = 0;
      }

      // Vikram sometimes comes late
      if (emp.id === employees[3].id && dayOfWeek === 3) {
        checkInHour = 10;
        checkInMin = 30;
      }

      // Neha works a bit extra on Mondays
      if (emp.id === employees[4].id && dayOfWeek === 1) {
        checkOutHour = 19; // 2 hours overtime
      }

      const checkIn = new Date(`${dateStr}T${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}:00+05:30`);
      const checkOut = new Date(`${dateStr}T${String(checkOutHour).padStart(2, "0")}:${String(checkOutMin).padStart(2, "0")}:00+05:30`);
      const workedMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

      let status: "PRESENT" | "LATE" = "PRESENT";
      if (checkInHour > 9 || (checkInHour === 9 && checkInMin > 15)) {
        status = "LATE";
      }

      await prisma.attendanceRecord.create({
        data: {
          employeeId: emp.id,
          workingScheduleId: emp.workingScheduleId,
          checkIn,
          checkOut,
          workedMinutes,
          status,
          source: "WIDGET",
        },
      });

      current.setDate(current.getDate() + 1);
    }
  }

  // Intern — Arjun: seed a few part-time attendance records
  for (let d = 25; d <= 29; d++) {
    const dateStr = `2026-08-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const checkIn = new Date(`${dateStr}T10:00:00+05:30`);
    const checkOut = new Date(`${dateStr}T14:00:00+05:30`);
    await prisma.attendanceRecord.create({
      data: {
        employeeId: employees[8].id,
        workingScheduleId: schedPart.id,
        checkIn,
        checkOut,
        workedMinutes: 240,
        status: "PRESENT",
        source: "WIDGET",
      },
    });
  }

  console.log("📊 ~80 Attendance Records created (with overtime & late entries).");

  console.log("\n🎉 Seed complete! Summary:");
  console.log("  • 1 Company");
  console.log("  • 5 Departments (with managers)");
  console.log("  • 9 Job Positions");
  console.log("  • 2 Working Schedules (40h + 20h)");
  console.log("  • 2 Salary Structures (Full Time CTC + Intern)");
  console.log("  • 11 Employees (9 active, 1 on leave, 1 inactive)");
  console.log("  • 3 User logins (Admin, HR Manager, Employee)");
  console.log("  • 11 Contracts");
  console.log("  • 3 Time Off Types + Allocations");
  console.log("  • 5 Time Off Requests");
  console.log("  • ~80 Attendance Records");
  console.log("\n  Admin login:  buddhdevdarshan1478@gmail.com / DB@#1478");
  console.log("  HR login:     ananya.desai@paycore.in / PayCore@123");
  console.log("  Employee:     priya.patel@paycore.in / PayCore@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
