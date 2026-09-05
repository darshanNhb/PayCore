import { jsPDF } from "jspdf";

export interface PayslipPdfData {
  companyName: string;
  companyAddress?: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  jobPosition: string;
  dateOfJoining?: string;
  panNumber?: string;
  bankAccount?: string;
  period: string;
  workedDays: number;
  totalWorkingDays: number;
  unpaidLeaveDays: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
}

export function generatePayslipPdf(data: PayslipPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Background Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 10, pageWidth - 24, 25, 3, 3, "F");

  // Company Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75); // Deep Indigo
  doc.text(data.companyName || "PayCore India Pvt. Ltd.", 18, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Automated People & Payroll Operating System", 18, 28);

  // Payslip Badge Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229);
  doc.text("PAYSLIP", pageWidth - 18, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(data.period, pageWidth - 18, 27, { align: "right" });

  y = 42;

  // Employee Summary Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Employee Information", 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  // Col 1
  doc.text("Name:", 18, y + 14);
  doc.text("Employee Code:", 18, y + 20);
  doc.text("Department:", 18, y + 26);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, 48, y + 14);
  doc.text(data.employeeCode, 48, y + 20);
  doc.text(data.department, 48, y + 26);

  // Col 2
  const col2X = 110;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Designation:", col2X, y + 14);
  doc.text("Worked Days:", col2X, y + 20);
  doc.text("Unpaid Leaves:", col2X, y + 26);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.jobPosition, col2X + 28, y + 14);
  doc.text(`${data.workedDays} / ${data.totalWorkingDays} days`, col2X + 28, y + 20);
  doc.text(`${data.unpaidLeaveDays} days`, col2X + 28, y + 26);

  y = 80;

  // Earnings & Deductions Tables (Side by Side)
  const colWidth = (pageWidth - 28) / 2;

  // Earnings Header
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, colWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("EARNINGS", 16, y + 5.5);
  doc.text("AMOUNT (INR)", 12 + colWidth - 5, y + 5.5, { align: "right" });

  // Deductions Header
  const dedX = 16 + colWidth;
  doc.setFillColor(241, 245, 249);
  doc.rect(dedX, y, colWidth, 8, "F");
  doc.text("DEDUCTIONS", dedX + 4, y + 5.5);
  doc.text("AMOUNT (INR)", dedX + colWidth - 5, y + 5.5, { align: "right" });

  y += 12;
  const startItemsY = y;

  // Earnings Lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let earnY = startItemsY;
  for (const item of data.earnings) {
    doc.setTextColor(71, 85, 105);
    doc.text(item.name, 16, earnY);
    doc.setTextColor(15, 23, 42);
    doc.text(item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 12 + colWidth - 5, earnY, { align: "right" });
    earnY += 6.5;
  }

  // Deductions Lines
  let dedY = startItemsY;
  for (const item of data.deductions) {
    doc.setTextColor(71, 85, 105);
    doc.text(item.name, dedX + 4, dedY);
    doc.setTextColor(15, 23, 42);
    doc.text(item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }), dedX + colWidth - 5, dedY, { align: "right" });
    dedY += 6.5;
  }

  y = Math.max(earnY, dedY, 135) + 5;

  // Subtotals
  doc.setDrawColor(226, 232, 240);
  doc.line(12, y, 12 + colWidth, y);
  doc.line(dedX, y, dedX + colWidth, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Total Gross Earnings", 16, y);
  doc.text(`INR ${data.grossAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 12 + colWidth - 5, y, { align: "right" });

  doc.text("Total Deductions", dedX + 4, y);
  doc.text(`INR ${data.totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, dedX + colWidth - 5, y, { align: "right" });

  y += 14;

  // NET SALARY HIGHLIGHT BOX
  doc.setFillColor(238, 242, 255); // Indigo light
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(12, y, pageWidth - 24, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text("NET SALARY PAYABLE", 18, y + 9);

  doc.setFontSize(14);
  doc.setTextColor(67, 56, 202);
  doc.text(`INR ${data.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 18, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241);
  doc.text("Transferred securely via Automated Direct Bank Settlement", 18, y + 16);

  // Footer / Signatures
  y = 240;
  doc.setDrawColor(203, 213, 225);
  doc.line(18, y, 70, y);
  doc.line(pageWidth - 70, y, pageWidth - 18, y);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Employer Authorized Signatory", 18, y + 5);
  doc.text("Employee Signature", pageWidth - 70, y + 5);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer generated salary document and does not require a physical signature in digital format.", pageWidth / 2, 280, { align: "center" });

  return doc;
}
