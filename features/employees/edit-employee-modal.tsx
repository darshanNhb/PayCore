"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { DepartmentOption, JobPositionOption, EmployeeListItem } from "./types";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: any;
}

export function EditEmployeeModal({ isOpen, onClose, onSuccess, employee }: EditEmployeeModalProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPositionOption[]>([]);
  const [managers, setManagers] = useState<EmployeeListItem[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    personalEmail: "",
    phone: "",
    dateOfBirth: "",
    workLocation: "",
    departmentId: "",
    jobPositionId: "",
    managerId: "",
    workingScheduleId: "",
    employeeType: "FULL_TIME",
    status: "ACTIVE",
    bankAccountNumber: "",
    bankIfsc: "",
    pan: "",
  });

  // Pre-fill form with employee data when modal opens
  useEffect(() => {
    if (!isOpen || !employee) return;

    setFormData({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      workEmail: employee.workEmail || "",
      personalEmail: employee.personalEmail || "",
      phone: employee.phone || "",
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "",
      workLocation: employee.workLocation || "",
      departmentId: employee.departmentId || employee.department?.id || "",
      jobPositionId: employee.jobPositionId || employee.jobPosition?.id || "",
      managerId: employee.managerId || "",
      workingScheduleId: employee.workingScheduleId || employee.workingSchedule?.id || "",
      employeeType: employee.employeeType || "FULL_TIME",
      status: employee.status || "ACTIVE",
      // Raw values are only available to HR/Admin; otherwise leave blank
      bankAccountNumber: employee.rawBank || "",
      bankIfsc: employee.bankIfsc || "",
      pan: employee.rawPan || "",
    });

    setError(null);
  }, [isOpen, employee]);

  // Load master data for dropdowns
  useEffect(() => {
    if (!isOpen) return;

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

    fetch("/api/working-schedules")
      .then((res) => res.json())
      .then((d) => d.data && setSchedules(d.data))
      .catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        workEmail: formData.workEmail,
        personalEmail: formData.personalEmail || null,
        phone: formData.phone || null,
        dateOfBirth: formData.dateOfBirth || null,
        workLocation: formData.workLocation || null,
        departmentId: formData.departmentId,
        jobPositionId: formData.jobPositionId,
        managerId: formData.managerId || null,
        workingScheduleId: formData.workingScheduleId || null,
        employeeType: formData.employeeType,
        status: formData.status,
        bankAccountNumber: formData.bankAccountNumber || null,
        bankIfsc: formData.bankIfsc || null,
        pan: formData.pan || null,
      };

      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update employee");
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

  // Filter out current employee from manager list
  const availableManagers = managers.filter((m) => m.id !== employee?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* ── Personal Info ── */}
        <div className="form-grid">
          <label>
            First name *
            <input
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </label>
          <label>
            Last name *
            <input
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
            />
          </label>
          <label>
            Personal email
            <input
              type="email"
              value={formData.personalEmail}
              onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
              placeholder="e.g. personal@gmail.com"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Phone
            <input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </label>
        </div>

        {/* ── Work Info ── */}
        <div style={{ borderTop: "1px solid #E7E5E4", paddingTop: "12px" }}>
          <b style={{ fontSize: "13px", color: "#1C1917" }}>Work Information</b>
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
              {availableManagers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
              ))}
            </select>
          </label>

          <label>
            Working schedule
            <select
              value={formData.workingScheduleId}
              onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
            >
              <option value="">No schedule</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Work location
            <input
              value={formData.workLocation}
              onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              placeholder="e.g. Bengaluru, India"
            />
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

        <label>
          Status
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </label>

        {/* ── Bank & Statutory ── */}
        <div style={{ borderTop: "1px solid #E7E5E4", paddingTop: "12px" }}>
          <b style={{ fontSize: "13px", color: "#1C1917" }}>Bank &amp; Statutory Details</b>
          <p style={{ fontSize: "12px", color: "#78716C", marginTop: "2px" }}>
            Bank details are verified automatically when both account number and IFSC are provided.
          </p>
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
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
