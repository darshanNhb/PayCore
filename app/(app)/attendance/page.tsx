"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";

interface AttendanceItem {
  id: string;
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
  const [table, setTable] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // 1. Fetch live check-in status from server
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

  // 2. Fetch attendance records
  const loadRecords = useCallback(() => {
    setLoading(true);
    fetch("/api/attendance?pageSize=50")
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setRecords(d.data);
      })
      .catch((err) => console.error("Error loading records:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStatus();
    loadRecords();
  }, [loadStatus, loadRecords]);

  // Live seconds timer derived from actual server checkIn time
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
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Time &gt; Attendance</div>
          <h1>Attendance</h1>
          <p>
            September 2026 <span className="dot-sep">•</span> All locations
          </p>
        </div>

        <div className="attendance-widget">
          <div>
            <span>{checkedIn ? "Working today" : "Welcome back"}</span>
            <b>{checkedIn ? formatTimer() : "Not checked in"}</b>
          </div>
          <button
            className={checkedIn ? "stop" : "primary"}
            onClick={handleToggleCheckIn}
            disabled={toggling}
          >
            {toggling ? "Saving..." : checkedIn ? "Check out" : "Check in"}
          </button>
        </div>
      </div>

      <section className="surface attendance-shell">
        <div className="table-toolbar">
          <div>
            <button
              className={!table ? "filter-on" : ""}
              onClick={() => setTable(false)}
            >
              Calendar
            </button>
            <button
              className={table ? "filter-on" : ""}
              onClick={() => setTable(true)}
            >
              Table view
            </button>
          </div>

          <button className="secondary">
            <ChevronLeft size={16} /> September 2026 <ChevronRight size={16} />
          </button>
        </div>

        {!table ? (
          <div className="calendar">
            <div className="weekday">Mon</div>
            <div className="weekday">Tue</div>
            <div className="weekday">Wed</div>
            <div className="weekday">Thu</div>
            <div className="weekday">Fri</div>
            <div className="weekday">Sat</div>
            <div className="weekday">Sun</div>

            {Array.from({ length: 35 }, (_, i) => {
              const n = i;
              const isMonthDay = n < 30;
              const dayOfWeek = (n + 1) % 7;
              const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
              const isLate = n === 7 || n === 13;
              const type = !isMonthDay
                ? "empty"
                : isLate
                ? "exception"
                : isWeekend
                ? "weekend"
                : "present";

              return (
                <button className={`day ${type}`} key={i}>
                  <span>{isMonthDay ? n + 1 : ""}</span>
                  {isMonthDay && (
                    <i>
                      {type === "present"
                        ? "✓"
                        : type === "exception"
                        ? "⚠"
                        : "—"}
                    </i>
                  )}
                  <small>{type === "exception" ? "Late" : ""}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Worked hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#78716C" }}>
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="employee-cell">
                        <Avatar
                          initials={r.employee.initials}
                          color={r.employee.avatarColor}
                          small
                        />
                        <b>{r.employee.name}</b>
                      </div>
                    </td>
                    <td>
                      {new Date(r.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {r.checkOut
                        ? new Date(r.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>{formatWorkedTime(r.workedMinutes)}</td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
