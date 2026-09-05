"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  defaultDepartmentId: string;
  defaultJobPositionId: string;
}

export function NewContractModal({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  defaultDepartmentId,
  defaultJobPositionId,
}: NewContractModalProps) {
  const [structures, setStructures] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    wagePerMonth: "85000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    salaryStructureId: "",
    status: "RUNNING",
  });

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/payroll/structures")
      .then((res) => res.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setStructures(d.data);
          setFormData((prev) => ({ ...prev, salaryStructureId: d.data[0].id }));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        employeeId,
        departmentId: defaultDepartmentId,
        jobPositionId: defaultJobPositionId,
        salaryStructureId: formData.salaryStructureId,
        wagePerMonth: Number(formData.wagePerMonth),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        status: formData.status,
      };

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create contract");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Contract">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="form-grid">
          <label>
            Monthly Wage (₹) *
            <input
              type="number"
              required
              value={formData.wagePerMonth}
              onChange={(e) => setFormData({ ...formData, wagePerMonth: e.target.value })}
            />
          </label>

          <label>
            Salary Structure *
            <select
              required
              value={formData.salaryStructureId}
              onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Start Date *
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </label>

          <label>
            End Date (optional)
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </label>
        </div>

        <label>
          Contract Status
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="RUNNING">Running (Active)</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Contract"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
