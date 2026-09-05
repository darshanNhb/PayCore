"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Modal } from "@/components/ui/modal";

interface AttendanceItem {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    initials: string;
    avatarColor: string;
    department: string;
  };
  checkIn: string;
  checkOut: string | null;
  workedMinutes: number | null;
  status: string;
}

export default function AttendancePage() {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Date range for filtering
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Employee filter
  const [employees, setEmployees] = useState<{ id: string; name: string; department: string }[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");

  // Load employee list for filter
  useEffect(() => {
    fetch("/api/employees?pageSize=200")
      .then((r) => r.json())
      .then((d) => d.data && setEmployees(d.data))
      .catch(() => {});
  }, []);

  // 1. Fetch live check-in status
  const loadStatus = useCallback(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((d) => {
        if (d.data?.checkedIn) {
          setCheckedIn(true);
          setCheckInTime(new Date(d.data.checkInTime));
          setSeconds(d.data.elapsedSeconds || 0);
        } else {
          setCheckedIn(false);
          setCheckInTime(null);
          setSeconds(0);
        }
      })
      .catch((err) => console.error("Error loading status:", err));
  }, []);

  // 2. Fetch attendance records for the month
  const loadRecords = useCallback(() => {
    setLoading(true);
    const from = selectedMonth.toISOString();
    const toDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
    const to = toDate.toISOString();

    const params = new URLSearchParams({ from, to, pageSize: "200" });
    if (filterEmployeeId) params.set("employeeId", filterEmployeeId);

    fetch(`/api/attendance?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setRecords(d.data);
      })
      .catch((err) => console.error("Error loading records:", err))
      .finally(() => setLoading(false));
  }, [selectedMonth, filterEmployeeId]);

  useEffect(() => {
    loadStatus();
    loadRecords();
  }, [loadStatus, loadRecords]);

  // Live seconds timer
  useEffect(() => {
    if (!checkedIn || !checkInTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.max(0, Math.floor((now.getTime() - checkInTime.getTime()) / 1000));
      setSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkedIn, checkInTime]);

  const handleToggleCheckIn = async () => {
    setToggling(true);
    try {
      const endpoint = checkedIn ? "/api/attendance/check-out" : "/api/attendance/check-in";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to toggle attendance");
      }
      loadStatus();
      loadRecords();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Delete this attendance record?")) return;
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadRecords();
      } else {
        const data = await res.json();
        alert(data.error?.message || "Failed to delete record");
      }
    } catch {
      alert("An error occurred");
    }
  };

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const formatTimer = () => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatWorkedTime = (mins: number | null) => {
    if (mins === null || mins === undefined) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const monthName = selectedMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Calendar data
  const calendarDays = buildCalendarDays(selectedMonth, records);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Time &gt; Attendance</div>
          <h1>Attendance</h1>
          <p>List view of employee attendance records.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Check In/Out Widget */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: checkedIn ? "#F0FDF4" : "#FAFAF9",
            border: checkedIn ? "1px solid #BBF7D0" : "1px solid #E7E5E4",
            borderRadius: "12px",
            padding: "12px 20px",
          }}>
            <div>
              <span style={{ fontSize: "12px", color: "#78716C" }}>
                {checkedIn ? "Working today" : "Welcome back"}
              </span>
              <div style={{ fontSize: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: checkedIn ? "#16A34A" : "#1C1917" }}>
                {checkedIn ? formatTimer() : "Not checked in"}
              </div>
              {checkedIn && checkInTime && (
                <span style={{ fontSize: "11px", color: "#78716C" }}>
                  Since {checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <button
              className={checkedIn ? "stop" : "primary"}
              onClick={handleToggleCheckIn}
              disabled={toggling}
              style={{ whiteSpace: "nowrap" }}
            >
              {toggling ? "Saving..." : checkedIn ? "Check out" : "Check in"}
            </button>
          </div>

          <button className="primary" onClick={() => setShowManualModal(true)}>
            <Plus size={16} /> Add record
          </button>
        </div>
      </div>

      <section className="surface" style={{ padding: 0 }}>
        <div className="table-toolbar" style={{ padding: "12px 20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className={view === "table" ? "filter-on" : ""} onClick={() => setView("table")}>
              Table
            </button>
            <button className={view === "calendar" ? "filter-on" : ""} onClick={() => setView("calendar")}>
              Calendar
            </button>
            <span style={{ width: "1px", height: "20px", background: "#E7E5E4", margin: "0 4px" }} />
            <button className="secondary" onClick={goToday} style={{ fontSize: "12px", padding: "4px 12px" }}>
              Today
            </button>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              style={{ fontSize: "13px" }}
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <ChevronLeft size={18} />
            </button>
            <b style={{ fontSize: "14px", minWidth: "140px", textAlign: "center" }}>{monthName}</b>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading...
          </div>
        ) : view === "table" ? (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Worked hours</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#78716C" }}>
                    No attendance records found for {monthName}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="employee-cell">
                        <Avatar initials={r.employee.initials} color={r.employee.avatarColor} small />
                        <div>
                          <b>{r.employee.name}</b>
                          <div style={{ fontSize: "11px", color: "#78716C" }}>{r.employee.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {new Date(r.checkIn).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td>
                      {new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      {r.checkOut
                        ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td>{formatWorkedTime(r.workedMinutes)}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td>
                      <button
                        type="button"
                        aria-label="Delete record"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0, display: "flex" }}
                        onClick={() => handleDeleteRecord(r.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* Calendar View */
          <div style={{ padding: "20px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              textAlign: "center",
              fontSize: "12px",
            }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} style={{ padding: "8px", fontWeight: 700, color: "#78716C" }}>{d}</div>
              ))}
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 6px",
                    borderRadius: "8px",
                    minHeight: "60px",
                    background: day.isEmpty
                      ? "transparent"
                      : day.isToday
                      ? "#EEF2FF"
                      : day.isWeekend
                      ? "#F5F5F4"
                      : "#FAFAF9",
                    border: day.isToday ? "2px solid #6366F1" : "1px solid #E7E5E4",
                    opacity: day.isEmpty ? 0.3 : 1,
                  }}
                >
                  {!day.isEmpty && (
                    <>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: day.isToday ? "#4F46E5" : "#1C1917" }}>
                        {day.dayNum}
                      </div>
                      {day.status === "PRESENT" && (
                        <div style={{ marginTop: "4px", fontSize: "10px", color: "#16A34A", fontWeight: 600 }}>✓ Present</div>
                      )}
                      {day.status === "LATE" && (
                        <div style={{ marginTop: "4px", fontSize: "10px", color: "#D97706", fontWeight: 600 }}>⚠ Late</div>
                      )}
                      {day.status === "ABSENT" && !day.isWeekend && day.isPast && (
                        <div style={{ marginTop: "4px", fontSize: "10px", color: "#EF4444", fontWeight: 600 }}>✗ Absent</div>
                      )}
                      {day.workedHours !== null && (
                        <div style={{ fontSize: "10px", color: "#78716C", marginTop: "2px" }}>{day.workedHours}</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <ManualAttendanceModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={() => { loadRecords(); setShowManualModal(false); }}
        employees={employees}
      />
    </>
  );
}

/* ── Calendar Builder ── */
interface CalendarDay {
  dayNum: number;
  isEmpty: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  status: "PRESENT" | "LATE" | "ABSENT" | null;
  workedHours: string | null;
}

function buildCalendarDays(month: Date, records: AttendanceItem[]): CalendarDay[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, m, 1).getDay() + 6) % 7; // Mon = 0

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;

  // Build a map: dayNum -> best status + worked minutes
  const dayMap: Record<number, { status: string; workedMinutes: number | null }> = {};
  for (const r of records) {
    const d = new Date(r.checkIn).getDate();
    if (!dayMap[d] || r.status === "LATE") {
      dayMap[d] = { status: r.status, workedMinutes: r.workedMinutes };
    }
  }

  const cells: CalendarDay[] = [];

  // Empty cells before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ dayNum: 0, isEmpty: true, isToday: false, isWeekend: false, isPast: false, status: null, workedHours: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (new Date(year, m, d).getDay() + 6) % 7; // Mon=0, Sun=6
    const isWeekend = dayOfWeek >= 5;
    const isToday = isCurrentMonth && today.getDate() === d;
    const isPast = new Date(year, m, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const rec = dayMap[d];
    let status: CalendarDay["status"] = null;
    let workedHours: string | null = null;

    if (rec) {
      status = rec.status === "LATE" ? "LATE" : "PRESENT";
      if (rec.workedMinutes !== null) {
        const h = Math.floor(rec.workedMinutes / 60);
        const mm = rec.workedMinutes % 60;
        workedHours = `${h}h ${String(mm).padStart(2, "0")}m`;
      }
    } else if (isPast && !isWeekend) {
      status = "ABSENT";
    }

    cells.push({ dayNum: d, isEmpty: false, isToday, isWeekend, isPast, status, workedHours });
  }

  // Pad remaining cells to fill grid
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: 0, isEmpty: true, isToday: false, isWeekend: false, isPast: false, status: null, workedHours: null });
  }

  return cells;
}

/* ── Manual Attendance Modal ── */
function ManualAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  employees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: { id: string; name: string; department: string }[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState("PRESENT");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        employeeId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: checkOut ? new Date(checkOut).toISOString() : null,
        status,
        correctionReason: reason || "Manual entry by admin",
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to add record");
      }

      // Reset
      setEmployeeId("");
      setCheckIn("");
      setCheckOut("");
      setStatus("PRESENT");
      setReason("");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Attendance Record">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <label>
          Employee *
          <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label>
            Check in *
            <input required type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label>
            Check out
            <input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="MANUALLY_CORRECTED">Manually Corrected</option>
            </select>
          </label>
          <label>
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Forgot to check in" />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Adding..." : "Add record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
