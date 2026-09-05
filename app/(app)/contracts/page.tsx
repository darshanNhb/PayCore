"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/utils/format";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    fetch(`/api/contracts?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setContracts(d.data);
      })
      .catch((err) => console.error("Failed to load contracts:", err))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Contracts</h1>
          <p>Manage employee contracts and salary structures.</p>
        </div>
        <Link href="/employees" className="primary" style={{ textDecoration: "none" }}>
          <Plus size={16} /> New contract
        </Link>
      </div>

      <section className="surface table-shell">
        <div className="table-toolbar">
          <b>All Contracts ({contracts.length})</b>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="RUNNING">Running</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading contracts...
          </div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No contracts found.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contract no.</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Job position</th>
                <th>Salary structure</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Wage / month</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className={c.status === "RUNNING" ? "running-row" : ""}>
                  <td>
                    <b>{c.contractNumber}</b>
                  </td>
                  <td>
                    <Link
                      href={`/employees/${c.employee?.id}`}
                      style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}
                    >
                      {c.employee?.firstName} {c.employee?.lastName}
                    </Link>
                  </td>
                  <td>{c.department?.name}</td>
                  <td>{c.jobPosition?.title}</td>
                  <td>{c.salaryStructure?.name}</td>
                  <td>
                    {new Date(c.startDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    {c.endDate
                      ? new Date(c.endDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Ongoing"}
                  </td>
                  <td className="money">{formatCurrency(c.wagePerMonth)}</td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
