"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LockKeyhole, Download } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/utils/format";

interface PayrollTabProps {
  employee: any;
}

export function PayrollTab({ employee }: PayrollTabProps) {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payroll/payslips?employeeId=${employee.id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setPayslips(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employee.id]);

  const fallbackSalary = employee.currentContract
    ? Number(employee.currentContract.wagePerMonth)
    : 85000;

  return (
    <section className="surface table-shell">
      <div className="table-toolbar">
        <b>Payslip history</b>
        <span className="eyebrow">Linked from employee</span>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          Loading payslip records...
        </div>
      ) : payslips.length === 0 ? (
        <table>
          <thead>
            <tr>
              <th>Pay period</th>
              <th>Gross salary</th>
              <th>Net pay</th>
              <th>Status</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
            {["September 2026", "August 2026", "July 2026"].map((month, i) => (
              <tr key={month}>
                <td>
                  <b>{month}</b>
                </td>
                <td className="money">{formatCurrency(fallbackSalary)}</td>
                <td className="money">
                  {formatCurrency(Math.round(fallbackSalary * 0.82))}
                </td>
                <td>
                  <StatusPill status={i === 0 ? "PROCESSING" : "PAID"} />
                </td>
                <td>
                  {i === 0 ? (
                    <LockKeyhole size={15} style={{ color: "#A8A29E" }} />
                  ) : (
                    <Link
                      href="#"
                      style={{ color: "#4F46E5", display: "inline-flex", alignItems: "center" }}
                    >
                      <Download size={15} />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Pay period</th>
              <th>Gross salary</th>
              <th>Net pay</th>
              <th>Status</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>
                    {new Date(p.periodStart).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}
                  </b>
                </td>
                <td className="money">{formatCurrency(Number(p.grossAmount))}</td>
                <td className="money">{formatCurrency(Number(p.netAmount))}</td>
                <td>
                  <StatusPill status={p.status} />
                </td>
                <td>
                  <a
                    href={`/api/payroll/payslips/${p.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#4F46E5" }}
                  >
                    <Download size={15} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
