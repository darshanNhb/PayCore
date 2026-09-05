import fs from "fs";

const BASE_URL = "http://localhost:3000";

async function testPdfDownload() {
  console.log("Testing PDF download endpoint...");

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "darshan@paycore.in", password: "password" })
  });

  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const loginText = await loginRes.text();
  console.log("Login Status:", loginRes.status, "Response:", loginText);
  const cookieHeader = setCookies.map(c => c.split(";")[0]).join("; ");

  const slipsRes = await fetch(`${BASE_URL}/api/payroll/payslips`, {
    headers: { Cookie: cookieHeader }
  });
  console.log("Payslips Status:", slipsRes.status);
  const slipsJson = await slipsRes.json();
  const slips = slipsJson.data;
  console.log("Fetched Payslips:", slips?.length);
  if (!slips || slips.length === 0) {
    console.error("No payslips found! Response:", slipsJson);
    return;
  }

  const payslipId = slips[0].id;
  console.log("Downloading PDF for Payslip:", payslipId);

  const pdfRes = await fetch(`${BASE_URL}/api/payroll/payslips/${payslipId}/pdf`, {
    headers: { Cookie: cookieHeader }
  });

  console.log("PDF Response Status:", pdfRes.status);
  console.log("Content-Type:", pdfRes.headers.get("content-type"));
  console.log("Content-Disposition:", pdfRes.headers.get("content-disposition"));

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  console.log("Downloaded PDF size:", buffer.length, "bytes");

  // Check PDF magic header %PDF
  const isPdf = buffer.toString("utf8", 0, 4) === "%PDF";
  console.log("Header is '%PDF':", isPdf);

  if (isPdf) {
    fs.mkdirSync("./scratch", { recursive: true });
    fs.writeFileSync("./scratch/test-payslip.pdf", buffer);
    console.log("✓ PDF verified and written to ./scratch/test-payslip.pdf");
  } else {
    console.error("Invalid PDF data received:", buffer.toString("utf8", 0, 100));
  }
}

testPdfDownload().catch(console.error);
