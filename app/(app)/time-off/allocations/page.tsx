"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

interface AllocationItem {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  timeOffType: {
    id: string;
    name: string;
    unit: string;
  };
  allocatedAmount: number;
  takenAmount: number;
  remainingAmount: number;
  validFrom: string;
  validTo: string | null;
  status: string;
}

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    timeOffTypeId: "",
    allocatedAmount: 20,
    validFrom: `${new Date().getFullYear()}-01-01`,
    validTo: `${new Date().getFullYear()}-12-31`,
  });

  const loadAllocations = useCallback(() => {
    setLoading(true);
    fetch("/api/time-off/allocations")
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setAllocations(d.data);
      })
      .catch((err) => console.error("Error loading allocations:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  useEffect(() => {
    if (!isModalOpen) return;
    fetch("/api/employees?pageSize=100")
      .then((r) => r.json())
      .then((d) => d.data && setEmployees(d.data));
    fetch("/api/time-off/types")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setTypes(d.data);
          setForm((prev) => ({ ...prev, timeOffTypeId: d.data[0].id }));
        }
      });
  }, [isModalOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/time-off/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          allocatedAmount: Number(form.allocatedAmount),
          validFrom: new Date(form.validFrom).toISOString(),
          validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create allocation");
      setIsModalOpen(false);
      loadAllocations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Time &amp; Leave &gt; Allocations</div>
          <h1>Leave Allocations</h1>
          <p>Annual leave allowances and balances per employee.</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={17} /> New allocation
        </button>
      </div>

      <section className="surface table-shell">
        <div className="table-toolbar">
          <b>All Allocations ({allocations.length})</b>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading allocations...
          </div>
        ) : allocations.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No leave allocations found.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Time off type</th>
                <th>Total allocated</th>
                <th>Used</th>
                <th>Remaining</th>
                <th>Validity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const percent = Math.round((a.takenAmount / a.allocatedAmount) * 100);
                return (
                  <tr key={a.id}>
                    <td>
                      <b>
                        {a.employee.firstName} {a.employee.lastName}
                      </b>
                    </td>
                    <td>{a.timeOffType.name}</td>
                    <td>
                      {a.allocatedAmount} {a.timeOffType.unit.toLowerCase()}
                    </td>
                    <td>
                      {a.takenAmount} {a.timeOffType.unit.toLowerCase()}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <b>{a.remainingAmount}</b>
                        <div
                          style={{
                            width: "60px",
                            height: "6px",
                            background: "#E7E5E4",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: "100%",
                              background: percent > 80 ? "#EF4444" : "#4F46E5",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {new Date(a.validFrom).toLocaleDateString()} –{" "}
                      {a.validTo ? new Date(a.validTo).toLocaleDateString() : "Ongoing"}
                    </td>
                    <td>
                      <StatusPill status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {isModalOpen && (
        <div className="modal-back">
          <section className="modal">
            <span className="eyebrow">ALLOCATION</span>
            <h2>Grant Leave Allocation</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
              <label>
                Employee *
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.department})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Time off type *
                <select
                  required
                  value={form.timeOffTypeId}
                  onChange={(e) => setForm({ ...form, timeOffTypeId: e.target.value })}
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Allocated Amount (Days) *
                <input
                  type="number"
                  required
                  min="1"
                  value={form.allocatedAmount}
                  onChange={(e) => setForm({ ...form, allocatedAmount: Number(e.target.value) })}
                />
              </label>

              <div className="form-grid">
                <label>
                  Valid from *
                  <input
                    type="date"
                    required
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </label>
                <label>
                  Valid to (optional)
                  <input
                    type="date"
                    value={form.validTo}
                    onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                  />
                </label>
              </div>

              <footer>
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "Granting..." : "Grant allocation"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
