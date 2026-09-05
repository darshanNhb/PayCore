/**
 * PayCore Comprehensive Feature Test Suite
 * Tests all API endpoints, database operations, payroll engine, and page routes.
 */

const BASE_URL = "http://localhost:3000";

class CookieJar {
  constructor() {
    this.cookies = {};
  }
  setFromHeaders(headers) {
    // In Node fetch, headers.getSetCookie() returns array of set-cookie strings
    const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const sc of setCookies) {
      const [nameVal] = sc.split(";");
      const [name, ...valParts] = nameVal.split("=");
      if (name && valParts.length > 0) {
        this.cookies[name.trim()] = valParts.join("=").trim();
      }
    }
  }
  getCookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

const adminJar = new CookieJar();
const employeeJar = new CookieJar();

async function api(path, options = {}, jar = adminJar) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  const cookieStr = jar.getCookieHeader();
  if (cookieStr) {
    headers["Cookie"] = cookieStr;
  }
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const start = Date.now();
  const res = await fetch(url, { ...options, credentials: "omit", headers });
  const latency = Date.now() - start;

  jar.setFromHeaders(res.headers);

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  return { status: res.status, ok: res.ok, data, latency };
}

const results = [];

function record(suite, testName, pass, details = "", latency = 0) {
  results.push({ suite, testName, pass, details, latency });
  const icon = pass ? "✓ PASS" : "✗ FAIL";
  console.log(`[${icon}] [${latency}ms] ${suite} > ${testName}: ${details}`);
}

async function run() {
  console.log("=================================================");
  console.log("    PAYCORE FULL FEATURE VERIFICATION TEST SUITE  ");
  console.log("=================================================\n");

  // 1. Health Check
  try {
    const r = await api("/api/health");
    record("System Health", "Health Endpoint", r.ok, `Status ${r.status}`, r.latency);
  } catch (err) {
    record("System Health", "Health Endpoint", false, err.message);
  }

  // 2. Authentication - Admin
  try {
    const r = await api("/api/auth/login", {
      method: "POST",
      body: { email: "darshan@paycore.in", password: "password" }
    }, adminJar);
    record("Auth", "Admin Sign In", r.ok && r.data?.role === "ADMIN", `Role: ${r.data?.role}`, r.latency);
  } catch (err) {
    record("Auth", "Admin Sign In", false, err.message);
  }

  // 3. Auth Me - Admin
  try {
    const r = await api("/api/auth/me", {}, adminJar);
    record("Auth", "Admin Session Check (/api/auth/me)", r.ok && r.data?.user?.role === "ADMIN", `User: ${r.data?.user?.email}`, r.latency);
  } catch (err) {
    record("Auth", "Admin Session Check", false, err.message);
  }

  // 4. Authentication - Employee
  try {
    const r = await api("/api/auth/login", {
      method: "POST",
      body: { email: "aarav.mehta@paycore.in", password: "password" }
    }, employeeJar);
    record("Auth", "Employee Sign In", r.ok && r.data?.role === "EMPLOYEE", `Role: ${r.data?.role}`, r.latency);
  } catch (err) {
    record("Auth", "Employee Sign In", false, err.message);
  }

  // 5. Auth Me - Employee
  let employeeId = null;
  try {
    const r = await api("/api/auth/me", {}, employeeJar);
    employeeId = r.data?.user?.employeeId;
    record("Auth", "Employee Session Check", r.ok && !!employeeId, `Employee ID: ${employeeId}`, r.latency);
  } catch (err) {
    record("Auth", "Employee Session Check", false, err.message);
  }

  // 6. Departments
  let departmentId = null;
  try {
    const listRes = await api("/api/departments", {}, adminJar);
    const depts = listRes.data?.data || [];
    departmentId = depts[0]?.id;
    record("Core HR", "List Departments", listRes.ok, `Count: ${depts.length}`, listRes.latency);

    // Create test dept if none exists
    if (!departmentId) {
      const createRes = await api("/api/departments", {
        method: "POST",
        body: { name: "Product Engineering" }
      }, adminJar);
      departmentId = createRes.data?.data?.id;
      record("Core HR", "Create Department", createRes.ok, `Created ID: ${departmentId}`, createRes.latency);
    }
  } catch (err) {
    record("Core HR", "Departments", false, err.message);
  }

  // 7. Job Positions
  let jobPositionId = null;
  try {
    const listRes = await api("/api/job-positions", {}, adminJar);
    const jobs = listRes.data?.data || [];
    jobPositionId = jobs[0]?.id;
    record("Core HR", "List Job Positions", listRes.ok, `Count: ${jobs.length}`, listRes.latency);
  } catch (err) {
    record("Core HR", "Job Positions", false, err.message);
  }

  // 8. Working Schedules
  let scheduleId = null;
  try {
    const listRes = await api("/api/working-schedules", {}, adminJar);
    const schedules = listRes.data?.data || [];
    scheduleId = schedules[0]?.id;
    record("Core HR", "List Working Schedules", listRes.ok, `Count: ${schedules.length}`, listRes.latency);
  } catch (err) {
    record("Core HR", "Working Schedules", false, err.message);
  }

  // 9. Employees List & Detail
  try {
    const listRes = await api("/api/employees", {}, adminJar);
    const emps = listRes.data?.data || [];
    record("Core HR", "List Employees", listRes.ok, `Count: ${emps.length}`, listRes.latency);

    if (emps[0]?.id) {
      const detailRes = await api(`/api/employees/${emps[0].id}`, {}, adminJar);
      record("Core HR", "Get Employee Detail", detailRes.ok, `Code: ${detailRes.data?.data?.employeeCode}`, detailRes.latency);
    }
  } catch (err) {
    record("Core HR", "Employees", false, err.message);
  }

  // 10. Contracts
  try {
    const listRes = await api("/api/contracts", {}, adminJar);
    const contracts = listRes.data?.data || [];
    record("Core HR", "List Contracts", listRes.ok, `Count: ${contracts.length}`, listRes.latency);
  } catch (err) {
    record("Core HR", "Contracts", false, err.message);
  }

  // 11. Attendance - Status, Check-in, Check-out
  try {
    const statusBefore = await api("/api/attendance/status", {}, employeeJar);
    record("Attendance", "Get Attendance Status", statusBefore.ok, `CheckedIn: ${statusBefore.data?.data?.checkedIn}`, statusBefore.latency);

    if (statusBefore.data?.data?.checkedIn) {
      const checkOutRes = await api("/api/attendance/check-out", { method: "POST" }, employeeJar);
      record("Attendance", "Check Out", checkOutRes.ok, `Status: ${checkOutRes.status}`, checkOutRes.latency);
    }

    const checkInRes = await api("/api/attendance/check-in", { method: "POST" }, employeeJar);
    record("Attendance", "Check In", checkInRes.ok, `Status: ${checkInRes.status}`, checkInRes.latency);

    const checkOutRes = await api("/api/attendance/check-out", { method: "POST" }, employeeJar);
    record("Attendance", "Check Out after In", checkOutRes.ok, `Status: ${checkOutRes.status}`, checkOutRes.latency);

    const listRes = await api("/api/attendance", {}, adminJar);
    record("Attendance", "List Attendance Records", listRes.ok, `Count: ${listRes.data?.data?.length || 0}`, listRes.latency);
  } catch (err) {
    record("Attendance", "Attendance Flow", false, err.message);
  }

  // 12. Time Off - Types, Allocation, Requests
  try {
    const typesRes = await api("/api/time-off/types", {}, adminJar);
    const types = typesRes.data?.data || [];
    record("Time Off", "List Leave Types", typesRes.ok, `Count: ${types.length}`, typesRes.latency);

    const reqsRes = await api("/api/time-off/requests", {}, adminJar);
    record("Time Off", "List Leave Requests", reqsRes.ok, `Count: ${reqsRes.data?.data?.length || 0}`, reqsRes.latency);
  } catch (err) {
    record("Time Off", "Time Off Flow", false, err.message);
  }

  // 13. Payroll Engine - Salary Structures & Rules
  let salaryStructureId = null;
  try {
    const structuresRes = await api("/api/payroll/structures", {}, adminJar);
    const structures = structuresRes.data?.data || [];
    salaryStructureId = structures[0]?.id;
    record("Payroll Engine", "List Salary Structures", structuresRes.ok, `Count: ${structures.length}`, structuresRes.latency);

    const rulesRes = await api("/api/payroll/rules", {}, adminJar);
    const rules = rulesRes.data?.data || [];
    record("Payroll Engine", "List Salary Rules", rulesRes.ok, `Count: ${rules.length}`, rulesRes.latency);
  } catch (err) {
    record("Payroll Engine", "Salary Rules & Structures", false, err.message);
  }

  // 14. Payroll Engine - Payruns & Computation
  try {
    const payrunsRes = await api("/api/payroll/payruns", {}, adminJar);
    const payruns = payrunsRes.data?.data || [];
    record("Payroll Engine", "List Payruns", payrunsRes.ok, `Count: ${payruns.length}`, payrunsRes.latency);

    // If a payrun exists, test compute / payslips
    if (payruns[0]?.id) {
      const payslipsRes = await api(`/api/payroll/payslips?payrunId=${payruns[0].id}`, {}, adminJar);
      record("Payroll Engine", "List Payslips for Payrun", payslipsRes.ok, `Count: ${payslipsRes.data?.data?.length || 0}`, payslipsRes.latency);
    }
  } catch (err) {
    record("Payroll Engine", "Payruns", false, err.message);
  }

  // 15. Dashboard Analytics
  try {
    const dashRes = await api("/api/dashboard", {}, adminJar);
    const stats = dashRes.data?.data?.kpis || dashRes.data?.kpis || dashRes.data;
    record("Dashboard", "Executive Dashboard KPI Aggregations", dashRes.ok, `Response OK`, dashRes.latency);
  } catch (err) {
    record("Dashboard", "Dashboard KPI", false, err.message);
  }

  // 16. UI Route Availability Tests (SSR / HTML generation)
  const pages = [
    { path: "/login", name: "Login Page" },
    { path: "/overview", name: "Admin Overview Dashboard" },
    { path: "/portal", name: "Employee Self-Service Portal" },
    { path: "/attendance", name: "Attendance Time Clock Page" },
    { path: "/time-off/requests", name: "Time Off Requests Page" },
    { path: "/payroll/rules", name: "Payroll Salary Rules Page" },
    { path: "/payroll/payruns", name: "Payroll Payruns Wizard Page" }
  ];

  for (const page of pages) {
    try {
      const r = await api(page.path, {}, adminJar);
      record("UI Routes", page.name, r.status === 200, `HTTP ${r.status}`, r.latency);
    } catch (err) {
      record("UI Routes", page.name, false, err.message);
    }
  }

  console.log("\n=================================================");
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("=================================================");
}

run().catch(console.error);
