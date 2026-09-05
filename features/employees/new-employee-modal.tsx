"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { DepartmentOption, JobPositionOption, EmployeeListItem } from "./types";

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewEmployeeModal({ isOpen, onClose, onSuccess }: NewEmployeeModalProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPositionOption[]>([]);
  const [managers, setManagers] = useState<EmployeeListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    personalEmail: "",
    phone: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    departmentId: "",
    jobPositionId: "",
    managerId: "",
    employeeType: "FULL_TIME",
    status: "ACTIVE",
    workLocation: "Bengaluru, India",
    bankAccountNumber: "",
    bankIfsc: "",
    pan: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    // Load master data for dropdowns
    fetch("/api/departments")
      .then((res) => res.json())
      .then((d) => d.data && setDepartments(d.data))
      .catch(() => {});

    fetch("/api/job-positions")
      .then((res) => res.json())
      .then((d) => d.data && setJobPositions(d.data))
      .catch(() => {});

    fetch("/api/employees?pageSize=100")
      .then((res) => res.json())
      .then((d) => d.data && setManagers(d.data))
      .catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        dateOfJoining: new Date(formData.dateOfJoining).toISOString(),
        managerId: formData.managerId || null,
        personalEmail: formData.personalEmail || null,
        phone: formData.phone || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        bankIfsc: formData.bankIfsc || null,
        pan: formData.pan || null,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create employee");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPositions = formData.departmentId
    ? jobPositions.filter((p) => !p.departmentId || p.departmentId === formData.departmentId)
    : jobPositions;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Employee">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="form-grid">
          <label>
            First name *
            <input
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Aarav"
            />
          </label>
          <label>
            Last name *
            <input
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Mehta"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Work email *
            <input
              required
              type="email"
              value={formData.workEmail}
              onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
              placeholder="e.g. aarav.mehta@paycore.in"
            />
          </label>
          <label>
            Date of joining *
            <input
              required
              type="date"
              value={formData.dateOfJoining}
              onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
            />
          </label>
        </div>

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
            Reporting manager
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
            >
              <option value="">No manager (Top level)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
              ))}
            </select>
          </label>

          <label>
            Employment type
            <select
              value={formData.employeeType}
              onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as any })}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </label>
        </div>

        <div style={{ borderTop: "1px solid #E7E5E4", paddingTop: "12px" }}>
          <b style={{ fontSize: "13px", color: "#1C1917" }}>Bank & Statutory Details (Optional)</b>
        </div>

        <div className="form-grid">
          <label>
            Bank account number
            <input
              value={formData.bankAccountNumber}
              onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              placeholder="e.g. 5010023456789"
            />
          </label>
          <label>
            Bank IFSC
            <input
              value={formData.bankIfsc}
              onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
              placeholder="e.g. HDFC0001234"
            />
          </label>
        </div>

        <label>
          PAN Card number
          <input
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            placeholder="e.g. ABCDE1234F"
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
