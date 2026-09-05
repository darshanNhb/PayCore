"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/utils/format";
import { NewContractModal } from "@/features/contracts/new-contract-modal";
import { EditContractModal } from "@/features/contracts/edit-contract-modal";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  const loadContracts = () => {
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
  };

  useEffect(() => {
    loadContracts();
  }, [status]);

  const handleDelete = async (contractId: string, contractNumber: string) => {
    if (!confirm(`Are you sure you want to delete contract ${contractNumber}?`)) return;
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { method: "DELETE" });
      if (res.ok) {
        loadContracts();
      } else {
        const data = await res.json();
        alert(data.error?.message || "Failed to delete contract");
      }
    } catch {
      alert("An error occurred");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Contracts</h1>
          <p>Manage employee contracts and salary structures.</p>
        </div>
        <button className="primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New contract
        </button>
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
                <th />
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
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        aria-label="Edit contract"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", padding: 0, display: "flex" }}
                        onClick={() => setEditingContract(c)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete contract"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0, display: "flex" }}
                        onClick={() => handleDelete(c.id, c.contractNumber)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <NewContractModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadContracts}
      />
      
      <EditContractModal
        isOpen={!!editingContract}
        onClose={() => setEditingContract(null)}
        onSuccess={() => {
          setEditingContract(null);
          loadContracts();
        }}
        contract={editingContract}
      />
    </>
  );
}
