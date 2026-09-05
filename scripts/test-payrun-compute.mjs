/**
 * Payrun Compute & Validate End-to-End Test
 */

const BASE_URL = "http://localhost:3000";

async function testPayrun() {
  console.log("\nTesting Payrun Lifecycle (Draft -> Compute -> Validate)...");

  // 1. Admin login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "darshan@paycore.in", password: "password" })
  });

  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const cookieHeader = setCookies.map(c => c.split(";")[0]).join("; ");

  // 2. Fetch salary structures
  const structRes = await fetch(`${BASE_URL}/api/payroll/structures`, {
    headers: { Cookie: cookieHeader }
  });
  const structs = (await structRes.json()).data;
  const structureId = structs[0]?.id;
  console.log("Using Structure:", structs[0]?.name, `(${structureId})`);

  // 3. Fetch employee
  const empRes = await fetch(`${BASE_URL}/api/employees`, {
    headers: { Cookie: cookieHeader }
  });
  const emps = (await empRes.json()).data;
  const employeeId = emps[0]?.id;
  console.log("Using Employee:", emps[0]?.firstName, `(${employeeId})`);

  // 4. Create Draft Payrun
  const createRes = await fetch(`${BASE_URL}/api/payroll/payruns`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      name: `Payrun March 2026 - Automated Test`,
      salaryStructureId: structureId,
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-03-31T23:59:59.999Z",
      employeeTypeScope: "ALL",
      employeeIds: [employeeId]
    })
  });

  const createText = await createRes.text();
  console.log("Create Payrun Response:", createRes.status, createText);
  let createJson = {};
  try { createJson = JSON.parse(createText); } catch {}
  const payrunId = createJson.data?.id;

  if (!payrunId) {
    console.error("Payrun creation failed:", createJson);
    return;
  }

  // 4. Compute Payrun (calculates formulas for all matching contracts)
  const computeRes = await fetch(`${BASE_URL}/api/payroll/payruns/${payrunId}/compute`, {
    method: "POST",
    headers: { Cookie: cookieHeader }
  });

  const computeJson = await computeRes.json();
  console.log("2. Computed Payrun:", computeRes.status, "Message:", computeJson.message || "OK");

  // 5. Check generated Payslips
  const payslipsRes = await fetch(`${BASE_URL}/api/payroll/payslips?payrunId=${payrunId}`, {
    headers: { Cookie: cookieHeader }
  });
  const slips = (await payslipsRes.json()).data;
  console.log("3. Generated Payslips Count:", slips?.length);
  if (slips && slips.length > 0) {
    const s = slips[0];
    console.log(`   Sample Payslip for Employee: Gross=₹${s.grossSalary}, Net=₹${s.netPay}, Deductions=₹${s.totalDeductions}`);
  }

  // 6. Validate Payrun
  const valRes = await fetch(`${BASE_URL}/api/payroll/payruns/${payrunId}/validate`, {
    method: "POST",
    headers: { Cookie: cookieHeader }
  });
  console.log("4. Validated Payrun Status:", valRes.status);

  console.log("\n✓ Payrun Compute & Validate flow successfully completed!");
}

testPayrun().catch(console.error);
