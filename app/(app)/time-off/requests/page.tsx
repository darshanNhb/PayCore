"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Plus, X, Check, LockKeyhole } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ApprovalTimeline } from "@/components/ui/approval-timeline";

interface LeaveRequestItem {
  id: string;
  employeeId: string;
  employee: string;
  employeeInitials: string;
  type: string;
  typeId: string;
  startDate: string;
  endDate: string;
  dates: string;
  duration: number;
  status: "TO_APPROVE" | "APPROVED" | "REFUSED" | "CANCELLED";
  reason: string;
  decisionNote?: string;
  createdAt: string;
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [selected, setSelected] = useState<LeaveRequestItem | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);

  // New Request Form State
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [newForm, setNewForm] = useState({
    employeeId: "",
    timeOffTypeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    durationAmount: 1,
    reason: "",
  });

  const loadRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);

    fetch(`/api/time-off/requests?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setRequests(d.data);
      })
      .catch((err) => console.error("Error loading requests:", err))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!isNewOpen) return;
    fetch("/api/employees?pageSize=100")
      .then((r) => r.json())
      .then((d) => d.data && setEmployees(d.data));
    fetch("/api/time-off/types")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setLeaveTypes(d.data);
          setNewForm((prev) => ({ ...prev, timeOffTypeId: d.data[0].id }));
        }
      });
  }, [isNewOpen]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/time-off/requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote: "Approved — enjoy the celebration." }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to approve request");
      }
      setSelected((prev) => (prev ? { ...prev, status: "APPROVED" } : null));
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefuse = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/time-off/requests/${id}/refuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote: "Refused due to project coverage." }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to refuse request");
      }
      setSelected((prev) => (prev ? { ...prev, status: "REFUSED" } : null));
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/time-off/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit leave request");
      }
      setIsNewOpen(false);
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            Time &amp; Leave <ChevronRight size={13} /> Requests
          </div>
          <h1>Leave requests</h1>
          <p>Approve requests and keep team balances in sync.</p>
        </div>
        <button className="primary" onClick={() => setIsNewOpen(true)}>
          <Plus size={17} /> New request
        </button>
      </div>

      <section className="surface table-shell">
        <div className="table-toolbar">
          <button className="filter-on">All requests</button>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="TO_APPROVE">To Approve</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUSED">Refused</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No leave requests found.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Duration</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <b>{r.employee}</b>
                  </td>
                  <td>{r.type}</td>
                  <td>{r.dates}</td>
                  <td>
                    {r.duration} day{r.duration > 1 ? "s" : ""}
                  </td>
                  <td>
                    <StatusPill status={r.status} />
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

      {/* Detail Modal */}
      {selected && (
        <div className="modal-back">
          <section className="modal detail-modal">
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X />
            </button>

            <div className="section-title">
              <div>
                <span className="eyebrow">
                  LEAVE REQUEST #{selected.id.slice(0, 8).toUpperCase()}
                </span>
                <h2>{selected.employee}</h2>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <dl>
              <dt>Time off type</dt>
              <dd>{selected.type}</dd>
              <dt>Dates</dt>
              <dd>{selected.dates}</dd>
              <dt>Duration</dt>
              <dd>{selected.duration} days</dd>
              <dt>Reason</dt>
              <dd>{selected.reason}</dd>
              <dt>Allocation used</dt>
              <dd>
                {selected.allocation ? (
                  <>
                    <b>{selected.type}</b> · {selected.allocation.allocatedAmount - selected.allocation.takenAmount} days remaining
                  </>
                ) : (
                  <><b>{selected.type}</b> · No allocation required</>
                )}
              </dd>
            </dl>

            {selected.allocation && (
              <div className="balance">
                <div>
                  <b>{selected.allocation.allocatedAmount - selected.allocation.takenAmount} of {selected.allocation.allocatedAmount} days</b>
                  <span>remaining</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${(selected.allocation.takenAmount / selected.allocation.allocatedAmount) * 100}%` }} />
                </div>
              </div>
            )}

            <ApprovalTimeline
              requesterName={selected.employee}
              requesterInitials={selected.employeeInitials}
              requestDate={new Date(selected.createdAt).toLocaleDateString()}
              status={selected.status}
              decisionNote={selected.decisionNote}
            />

            {selected.status === "TO_APPROVE" && (
              <footer>
                <button
                  className="danger-btn"
                  onClick={() => handleRefuse(selected.id)}
                  disabled={actionLoading}
                >
                  Refuse
                </button>
                <button
                  className="primary"
                  onClick={() => handleApprove(selected.id)}
                  disabled={actionLoading}
                >
                  <Check size={16} /> Approve &amp; deduct balance
                </button>
              </footer>
            )}
          </section>
        </div>
      )}

      {/* New Request Modal */}
      {isNewOpen && (
        <div className="modal-back">
          <section className="modal">
            <button
              className="modal-close"
              onClick={() => setIsNewOpen(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="eyebrow">NEW LEAVE REQUEST</span>
            <h2>Submit leave request</h2>
            <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
              <label>
                Employee *
                <select
                  required
                  value={newForm.employeeId}
                  onChange={(e) => setNewForm({ ...newForm, employeeId: e.target.value })}
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
                  value={newForm.timeOffTypeId}
                  onChange={(e) => setNewForm({ ...newForm, timeOffTypeId: e.target.value })}
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label>
                  Start date *
                  <input
                    type="date"
                    required
                    value={newForm.startDate}
                    onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                  />
                </label>
                <label>
                  End date *
                  <input
                    type="date"
                    required
                    value={newForm.endDate}
                    onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Duration (Days) *
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={newForm.durationAmount}
                  onChange={(e) => setNewForm({ ...newForm, durationAmount: Number(e.target.value) })}
                />
              </label>

              <label>
                Reason *
                <textarea
                  required
                  rows={2}
                  value={newForm.reason}
                  onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                  placeholder="e.g. Family wedding or medical appointment"
                />
              </label>

              <footer>
                <button type="button" className="secondary" onClick={() => setIsNewOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={actionLoading}>
                  {actionLoading ? "Submitting..." : "Submit request"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
