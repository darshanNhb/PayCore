"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LockKeyhole, Download, ChevronRight, FileText, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils/format";

export default function EmployeePortal() {
  const router = useRouter();
  const [page, setPage] = useState("My Home");
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    timeOffTypeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [timerStr, setTimerStr] = useState("00:00:00");
  const [loading, setLoading] = useState(true);

  // Load authenticated user and their linked data in parallel
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setLoading(false); // Unblock screen immediately!

          if (d.user.employeeId) {
            
            // Get first day and last day of current month
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
            
            Promise.all([
              fetch(`/api/employees/${d.user.employeeId}`).then((r) => r.json()).catch(() => null),
              fetch(`/api/payroll/payslips?employeeId=${d.user.employeeId}`).then((r) => r.json()).catch(() => null),
              fetch(`/api/time-off/types`).then((r) => r.json()).catch(() => null),
              fetch(`/api/time-off/allocations?employeeId=${d.user.employeeId}`).then((r) => r.json()).catch(() => null),
              fetch(`/api/time-off/requests?employeeId=${d.user.employeeId}`).then((r) => r.json()).catch(() => null),
              fetch(`/api/attendance?employeeId=${d.user.employeeId}&from=${from}&to=${to}`).then((r) => r.json()).catch(() => null),
            ]).then(([empData, slipsData, typesData, allocsData, reqsData, attData]) => {
              if (empData?.data) setEmployee(empData.data);
              if (slipsData?.data) setPayslips(slipsData.data);
              if (typesData?.data) {
                setLeaveTypes(typesData.data);
                if (typesData.data.length > 0) {
                  setLeaveForm((prev) => ({ ...prev, timeOffTypeId: typesData.data[0].id }));
                }
              }
              if (allocsData?.data) setAllocations(allocsData.data);
              if (reqsData?.data) setLeaveRequests(reqsData.data);
              if (attData?.data) setAttendanceRecords(attData.data);
            });
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // Load live attendance check-in status
  const loadAttendance = useCallback(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((d) => {
        if (d.data?.checkedIn) {
          setCheckedIn(true);
          setCheckInTime(new Date(d.data.checkInTime));
        } else {
          setCheckedIn(false);
          setCheckInTime(null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Live timer tick
  useEffect(() => {
    if (!checkedIn || !checkInTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const secs = Math.max(0, Math.floor((now.getTime() - checkInTime.getTime()) / 1000));
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      setTimerStr(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkedIn, checkInTime]);

  const handleToggleCheckIn = async () => {
    try {
      const endpoint = checkedIn ? "/api/attendance/check-out" : "/api/attendance/check-in";
      await fetch(endpoint, { method: "POST" });
      loadAttendance();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadPdf = (payslipId?: string) => {
    const id = payslipId || (payslips.length > 0 ? payslips[0].id : null);
    if (!id) {
      alert("No verified payslip available to download yet.");
      return;
    }
    window.open(`/api/payroll/payslips/${id}/pdf`, "_blank");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    
    try {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      
      const res = await fetch("/api/time-off/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          timeOffTypeId: leaveForm.timeOffTypeId,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          durationAmount: days,
          reason: leaveForm.reason,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to submit request");
      
      alert("Leave request submitted successfully for manager review!");
      
      // Reload requests
      const reqs = await fetch(`/api/time-off/requests?employeeId=${employee.id}`).then((r) => r.json());
      if (reqs.data) setLeaveRequests(reqs.data);
      
      setLeaveForm({ ...leaveForm, reason: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FAFAF9]" style={{ color: "#78716C" }}>
        Loading Employee Portal...
      </div>
    );
  }

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : `${user.firstName} ${user.lastName}`;
  const empRole = employee?.jobPosition?.title || "Product Designer";
  const initials = employee?.initials || `${user.firstName?.[0] || "A"}${user.lastName?.[0] || "M"}`;

  return (
    <div className="portal">
      <header>
        <div className="brand">
          <span className="brand-mark">P</span> paycore
        </div>

        <nav>
          {[
            "My Home",
            "My Profile",
            "My Attendance",
            "My Leave",
            "My Payslips",
            "My Documents",
          ].map((x) => (
            <button
              key={x}
              onClick={() => setPage(x)}
              className={page === x ? "active" : ""}
            >
              {x}
            </button>
          ))}
        </nav>

        <button className="portal-user group hover:bg-red-50 hover:border-red-100 transition-colors" onClick={handleLogout} title="Sign out">
          <Avatar
            initials={initials}
            color={employee?.avatarColor || "bg-indigo-100 text-indigo-700"}
            small
          />{" "}
          <span className="group-hover:text-red-600 transition-colors">{user.firstName}</span> <LogOut size={15} className="group-hover:text-red-500 transition-colors" />
        </button>
      </header>

      <main>
        {page === "My Home" && (
          <>
            <section className="portal-hero">
              <div>
                <span className="eyebrow">FRIDAY, 18 SEPTEMBER</span>
                <h1>Good morning, {user.firstName}</h1>
                <p>Here’s your week at a glance.</p>
                <button
                  className={checkedIn ? "stop" : "primary"}
                  onClick={handleToggleCheckIn}
                  style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Clock3 size={16} />
                  {checkedIn ? `Check out (${timerStr})` : "Check in"}
                </button>
              </div>
              <div className="portal-avatar">
                <Avatar
                  initials={initials}
                  color={employee?.avatarColor || "bg-indigo-100 text-indigo-700"}
                />
                <span>{empRole}</span>
              </div>
            </section>

            <div className="portal-grid">
              <section className="surface leave-card">
                <span className="eyebrow">LEAVE BALANCE</span>
                <h2>
                  {allocations[0] ? (allocations[0].allocatedAmount - allocations[0].takenAmount) : 0} days <small>remaining</small>
                </h2>
                <div className="bar">
                  <i style={{ width: `${allocations[0] ? (allocations[0].takenAmount / allocations[0].allocatedAmount) * 100 : 0}%` }} />
                </div>
                <p>{allocations[0]?.takenAmount || 0} days used of {allocations[0]?.allocatedAmount || 0} annual days</p>
                <button
                  className="secondary"
                  onClick={() => setPage("My Leave")}
                  style={{ marginTop: "14px" }}
                >
                  Request time off
                </button>
              </section>

              <section className="surface next-pay">
                <LockKeyhole size={22} />
                <span>Next payslip</span>
                <h2>September 2026</h2>
                <p>Available after payroll is approved.</p>
                <button
                  className="text-button"
                  onClick={() => setPage("My Payslips")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  View payslips <ChevronRight size={15} />
                </button>
              </section>
            </div>
          </>
        )}

        {page === "My Profile" && (
          <div className="portal-grid">
            <section className="surface detail-card">
              <h1>My profile</h1>
              <dl>
                <dt>Full name</dt>
                <dd>{empName}</dd>
                <dt>Work email</dt>
                <dd>{employee?.workEmail || user.email}</dd>
                <dt>Department</dt>
                <dd>{employee?.department?.name || "Product"}</dd>
                <dt>Job position</dt>
                <dd>{empRole}</dd>
                <dt>Manager</dt>
                <dd>
                  {employee?.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : "Neha Kapoor"}
                </dd>
                <dt>Bank Account</dt>
                <dd>{employee?.bankAccountMasked || "••••••••4812 (Verified)"}</dd>
              </dl>
            </section>

            <section className="surface detail-card">
              <h2>My documents</h2>
              <p style={{ color: "#78716C", fontSize: "13px", marginTop: "8px" }}>
                Offer Letter · ID Proof · Current Contract
              </p>
            </section>
          </div>
        )}

        {page === "My Attendance" && (
          <section className="surface detail-card">
            <h2>My attendance record</h2>
            <p className="sub">
              {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} · All locations
            </p>
            <div className="month-grid mini" style={{ marginTop: "20px" }}>
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = now.getDate();

                return Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  // Find record for this day
                  const record = attendanceRecords.find((r: any) => {
                    const recordDate = new Date(r.checkIn);
                    return recordDate.getDate() === day && recordDate.getMonth() === month && recordDate.getFullYear() === year;
                  });

                  let statusClass = "absent";
                  let icon = "✕";

                  if (isWeekend) {
                    statusClass = "weekend";
                    icon = "—";
                  } else if (record) {
                    if (record.status === "LATE") {
                      statusClass = "late";
                      icon = "⚠";
                    } else {
                      statusClass = "present";
                      icon = "✓";
                    }
                  } else if (day > today) {
                    statusClass = "future";
                    icon = ""; // Blank for future days
                  }

                  return (
                    <span
                      key={i}
                      className={statusClass}
                      title={record ? `In: ${new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${record.checkOut ? `\nOut: ${new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}` : isWeekend ? 'Weekend' : day > today ? '' : 'Absent'}
                    >
                      {day}
                      {icon && <i>{icon}</i>}
                    </span>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {page === "My Leave" && (
          <div className="portal-grid">
            <section className="surface detail-card">
              <h2>Request Time Off</h2>
              <form
                onSubmit={handleSubmitLeave}
                style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}
              >
                <label>
                  Leave type
                  <select 
                    value={leaveForm.timeOffTypeId}
                    onChange={(e) => setLeaveForm({...leaveForm, timeOffTypeId: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select a type...</option>
                    {leaveTypes.map(t => {
                      const alloc = allocations.find(a => a.timeOffTypeId === t.id && a.status === "APPROVED");
                      const remain = alloc ? (alloc.allocatedAmount - alloc.takenAmount) : 0;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.requiresAllocation ? `(${remain} days remaining)` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Start date
                    <input 
                      type="date" 
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                      required 
                    />
                  </label>
                  <label>
                    End date
                    <input 
                      type="date" 
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                      required 
                    />
                  </label>
                </div>
                <label>
                  Reason
                  <input 
                    placeholder="e.g. Family event" 
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                    required
                  />
                </label>
                <button type="submit" className="primary" style={{ alignSelf: "flex-start" }}>
                  Submit request
                </button>
              </form>
            </section>

            <section className="surface detail-card">
              <h2>Current Leave Balances</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
                {allocations.map((a, i) => {
                  const remaining = a.allocatedAmount - a.takenAmount;
                  const pct = (a.takenAmount / a.allocatedAmount) * 100;
                  const colors = ["#4F46E5", "#10B981", "#F59E0B", "#EC4899"];
                  const color = colors[i % colors.length];
                  
                  return (
                    <div key={a.id}>
                      <b>{a.timeOffType?.name || "Leave"}</b>
                      <p style={{ margin: "2px 0 6px 0", fontSize: "12px", color: "#78716C" }}>
                        {remaining} of {a.allocatedAmount} days remaining
                      </p>
                      <div className="bar" style={{ height: "6px", background: "#E7E5E4", borderRadius: "3px" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
                      </div>
                    </div>
                  );
                })}
                {allocations.length === 0 && (
                  <p style={{ fontSize: "13px", color: "#78716C" }}>No allocations found.</p>
                )}
              </div>
            </section>
            
            <section className="surface detail-card" style={{ gridColumn: "1 / -1" }}>
              <h2>My Leave Requests</h2>
              <div style={{ marginTop: "16px" }}>
                {leaveRequests.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#78716C", textAlign: "center", padding: "20px" }}>No leave requests submitted yet.</p>
                ) : (
                  <table style={{ width: "100%", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th style={{ paddingBottom: "8px", color: "#78716C", fontWeight: 600 }}>Type</th>
                        <th style={{ paddingBottom: "8px", color: "#78716C", fontWeight: 600 }}>Dates</th>
                        <th style={{ paddingBottom: "8px", color: "#78716C", fontWeight: 600 }}>Duration</th>
                        <th style={{ paddingBottom: "8px", color: "#78716C", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map(r => (
                        <tr key={r.id} style={{ borderTop: "1px solid #E7E5E4" }}>
                          <td style={{ padding: "12px 0" }}><b>{r.type}</b></td>
                          <td style={{ padding: "12px 0" }}>{r.dates}</td>
                          <td style={{ padding: "12px 0" }}>{r.duration} day{r.duration > 1 ? "s" : ""}</td>
                          <td style={{ padding: "12px 0" }}>
                            <span style={{ 
                              fontSize: "11px", 
                              padding: "2px 8px", 
                              borderRadius: "12px",
                              fontWeight: 600,
                              background: r.status === "APPROVED" ? "#DCFCE7" : r.status === "REFUSED" ? "#FEE2E2" : "#FEF9C3",
                              color: r.status === "APPROVED" ? "#16A34A" : r.status === "REFUSED" ? "#DC2626" : "#CA8A04"
                            }}>
                              {r.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}

        {page === "My Payslips" && (
          <section className="surface detail-card">
            <span className="eyebrow">PROTECTED DOCUMENTS</span>
            <h1>My payslips</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              {payslips.length === 0 ? (
                <div className="doc">
                  <LockKeyhole style={{ color: "#4F46E5" }} />
                  <span>
                    <b>August 2026 Payslip</b>
                    <small>Paid on 31 Aug 2026 · ₹69,700</small>
                  </span>
                  <button
                    className="primary"
                    onClick={() => handleDownloadPdf()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Download size={15} /> Download
                  </button>
                </div>
              ) : (
                payslips.map((p) => (
                  <div className="doc" key={p.id}>
                    <LockKeyhole style={{ color: "#4F46E5" }} />
                    <span>
                      <b>
                        {new Date(p.periodStart).toLocaleDateString("en-GB", {
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        Payslip
                      </b>
                      <small>
                        Paid on{" "}
                        {new Date(p.periodEnd).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {formatCurrency(p.netPay || p.netAmount)}
                      </small>
                    </span>
                    <button
                      className="primary"
                      onClick={() => handleDownloadPdf(p.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <Download size={15} /> Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {page === "My Documents" && (
          <section className="surface detail-card">
            <h2>My documents</h2>
            <p className="sub">Verified documents uploaded for your employee profile.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              {[
                { name: "Offer Letter.pdf", status: "Verified document" },
                { name: "Current Contract.pdf", status: "Updated 01 Apr 2026" },
                { name: "PAN Card.pdf", status: "Verified document" },
                { name: "ID Proof.pdf", status: "Verified document" },
              ].map((d) => (
                <div className="doc" key={d.name}>
                  <FileText style={{ color: "#4F46E5" }} />
                  <span>
                    <b>{d.name}</b>
                    <small>{d.status}</small>
                  </span>
                  <button className="secondary" onClick={() => alert(`Downloading ${d.name}`)}>
                    <Download size={15} /> Download
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
