"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Download, Search, X, LockKeyhole, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/utils/format";

interface PayslipListItem {
  id: string;
  payrunId: string;
  payrunName: string;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    initials: string;
    code: string;
    avatarColor: string;
    department: string;
    role: string;
  };
  period: string;
  periodStart: string;
  periodEnd: string;
  workedDays: number;
  grossSalary: number;
  netPay: number;
  totalDeductions: number;
  status: string;
  hasWarnings: boolean;
  warningsCount: number;
}

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<PayslipListItem[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPayslips = useCallback(() => {
    setLoading(true);
    fetch("/api/payroll/payslips?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setPayslips(d.data);
      })
      .catch((err) => console.error("Error loading payslips:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/payroll/payslips/${id}`);
      const data = await res.json();
      if (data.data) {
        setSelectedPayslip(data.data);
      }
    } catch (err) {
      console.error("Failed to load payslip detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = payslips.filter((p) =>
    `${p.employee.name} ${p.employee.code} ${p.employee.department}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Payroll &gt; Payslips</div>
          <h1>Payslips</h1>
          <p>Protected payroll documents for September 2026.</p>
        </div>
        <button
          className="secondary"
          onClick={() => alert("Exporting payroll register...")}
        >
          <Download size={17} /> Export register
        </button>
      </div>

      <section className="surface table-shell">
        <div className="table-toolbar">
          <div className="mini-search">
            <Search size={16} />
            <input
              placeholder="Search payslips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select>
            <option>All periods</option>
            <option>September 2026</option>
            <option>August 2026</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading payslips...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No payslips found.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Gross salary</th>
                <th>Net pay</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleOpenDetail(p.id)}
                  className={p.hasWarnings ? "warning-row" : ""}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="employee-cell">
                      <Avatar
                        initials={p.employee.initials}
                        color={p.employee.avatarColor}
                        small
                      />
                      <b>{p.employee.name}</b>
                      {p.hasWarnings && (
                        <small className="duplicate">
                          {p.warningsCount} alert{p.warningsCount > 1 ? "s" : ""}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>{p.period}</td>
                  <td className="money">{formatCurrency(p.grossSalary)}</td>
                  <td className="money">{formatCurrency(p.netPay)}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td>
                    <ChevronRight size={17} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="modal-back">
          <section className="modal payslip">
            <button
              className="modal-close"
              onClick={() => setSelectedPayslip(null)}
              aria-label="Close"
            >
              <X />
            </button>

            <div className="payslip-head">
              <div>
                <span className="eyebrow">
                  PAYSLIP ·{" "}
                  {new Date(selectedPayslip.periodStart).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  }).toUpperCase()}
                </span>
                <h2>
                  {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}
                </h2>
                <p>
                  {selectedPayslip.employee?.jobPosition?.title || "Staff"} ·{" "}
                  {selectedPayslip.employee?.employeeCode}
                </p>
              </div>
              <LockKeyhole size={22} />
            </div>

            <div className="pay-total">
              <span>Net pay</span>
              <b>{formatCurrency(Number(selectedPayslip.netAmount))}</b>
              <StatusPill status={selectedPayslip.status} />
            </div>

            <table>
              <thead>
                <tr>
                  <th>Salary rule</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedPayslip.lines?.map((line: any) => (
                  <tr key={line.id}>
                    <td>{line.ruleName}</td>
                    <td>{line.category}</td>
                    <td className={line.category === "DEDUCTION" ? "money amber-text" : "money"}>
                      {line.category === "DEDUCTION" ? "−" : ""}
                      {formatCurrency(Math.abs(Number(line.amount)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer>
              <button
                className="secondary"
                onClick={() => alert("Downloading password-protected PDF payslip...")}
              >
                <Download size={16} /> Download protected PDF
              </button>
              <Link
                href={`/employees/${selectedPayslip.employeeId}`}
                className="primary"
                style={{ textDecoration: "none" }}
              >
                View employee
              </Link>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
