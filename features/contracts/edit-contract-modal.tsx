"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

interface EditContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract: any;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface JobPositionOption {
  id: string;
  title: string;
  departmentId?: string;
}

interface SalaryStructureOption {
  id: string;
  name: string;
}

interface WorkingScheduleOption {
  id: string;
  name: string;
}

export function EditContractModal({ isOpen, onClose, onSuccess, contract }: EditContractModalProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPositionOption[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructureOption[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<WorkingScheduleOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    departmentId: "",
    jobPositionId: "",
    salaryStructureId: "",
    workingScheduleId: "",
    wagePerMonth: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  useEffect(() => {
    if (!isOpen || !contract) return;
    setFormData({
      departmentId: contract.departmentId || "",
      jobPositionId: contract.jobPositionId || "",
      salaryStructureId: contract.salaryStructureId || "",
      workingScheduleId: contract.workingScheduleId || "",
      wagePerMonth: contract.wagePerMonth?.toString() || "",
      startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
      status: contract.status || "DRAFT",
    });

    fetch("/api/departments")
      .then((res) => res.json())
      .then((d) => d.data && setDepartments(d.data))
      .catch(() => {});

    fetch("/api/job-positions")
      .then((res) => res.json())
      .then((d) => d.data && setJobPositions(d.data))
      .catch(() => {});

    fetch("/api/payroll/structures")
      .then((res) => res.json())
      .then((d) => d.data && setSalaryStructures(d.data))
      .catch(() => {});

    fetch("/api/working-schedules")
      .then((res) => res.json())
      .then((d) => d.data && setWorkingSchedules(d.data))
      .catch(() => {});
  }, [isOpen, contract]);

  const filteredPositions = formData.departmentId
    ? jobPositions.filter((p) => !p.departmentId || p.departmentId === formData.departmentId)
    : jobPositions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        departmentId: formData.departmentId,
        jobPositionId: formData.jobPositionId,
        salaryStructureId: formData.salaryStructureId,
        workingScheduleId: formData.workingScheduleId || null,
        wagePerMonth: parseFloat(formData.wagePerMonth),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        status: formData.status,
      };

      if (isNaN(payload.wagePerMonth) || payload.wagePerMonth <= 0) {
        throw new Error("Please enter a valid wage per month");
      }

      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update contract");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Contract">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="form-grid">
          <label>
            Department *
            <select
              required
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, jobPositionId: "" })}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>

          <label>
            Job position *
            <select
              required
              value={formData.jobPositionId}
              onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
            >
              <option value="">Select job position</option>
              {filteredPositions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Salary structure *
            <select
              required
              value={formData.salaryStructureId}
              onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
            >
              <option value="">Select salary structure</option>
              {salaryStructures.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label>
            Working schedule
            <select
              value={formData.workingScheduleId}
              onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
            >
              <option value="">None</option>
              {workingSchedules.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Wage per month (₹) *
          <input
            required
            type="number"
            min="1"
            step="0.01"
            value={formData.wagePerMonth}
            onChange={(e) => setFormData({ ...formData, wagePerMonth: e.target.value })}
            placeholder="e.g. 50000"
          />
        </label>

        <div className="form-grid">
          <label>
            Start date *
            <input
              required
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </label>
        </div>

        <label>
          Status *
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="DRAFT">Draft</option>
            <option value="RUNNING">Running</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
