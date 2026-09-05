"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/utils/format";
import { NewContractModal } from "./new-contract-modal";
import { EditContractModal } from "@/features/contracts/edit-contract-modal";

interface ContractsTabProps {
  employee: any;
  onRefresh: () => void;
}

export function ContractsTab({ employee, onRefresh }: ContractsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const contracts = employee.contracts || [];

  const handleActivate = async (contractId: string) => {
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RUNNING" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to activate contract");
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      <section className="surface table-shell">
        <div className="table-toolbar">
          <b>Contract history</b>
          <button className="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New contract
          </button>
        </div>

        {contracts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No contracts found for this employee.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contract no.</th>
                <th>Salary structure</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Wage / month</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contracts.map((c: any) => (
                <tr
                  key={c.id}
                  className={c.status === "RUNNING" ? "running-row" : ""}
                >
                  <td>
                    <b>{c.contractNumber}</b>
                  </td>
                  <td>{c.salaryStructure?.name || "Standard INR"}</td>
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
                      : "—"}
                  </td>
                  <td className="money">{formatCurrency(Number(c.wagePerMonth))}</td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {c.status === "DRAFT" && (
                        <button
                          className="secondary"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => handleActivate(c.id)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="secondary"
                        style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => setEditingContract(c)}
                        title="Edit contract"
                      >
                        <Pencil size={14} />
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        employeeId={employee.id}
        defaultDepartmentId={employee.departmentId}
        defaultJobPositionId={employee.jobPositionId}
      />

      <EditContractModal
        isOpen={!!editingContract}
        onClose={() => setEditingContract(null)}
        onSuccess={() => {
          setEditingContract(null);
          onRefresh();
        }}
        contract={editingContract}
      />
    </>
  );
}
