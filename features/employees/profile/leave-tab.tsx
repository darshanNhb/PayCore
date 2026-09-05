"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

interface LeaveTabProps {
  employee: any;
}

export function LeaveTab({ employee }: LeaveTabProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/time-off/requests?employeeId=${employee.id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setRequests(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employee.id]);

  const remaining = 14.5;
  const total = 20;
  const percentage = Math.round(((total - remaining) / total) * 100);

  return (
    <div className="profile-grid">
      <section className="surface detail-card">
        <div className="section-title">
          <h2>Leave balance</h2>
          <Link
            href="/time-off/requests"
            className="text-button"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            All Requests <ChevronRight size={14} />
          </Link>
        </div>

        <div className="balance">
          <div>
            <b>{remaining} days</b>
            <span>remaining of {total} days</span>
          </div>
          <div className="bar">
            <i style={{ width: `${percentage}%` }} />
          </div>
          <p>
            {total - remaining} days used <span className="dot-sep">•</span> Valid until 31 Dec 2026
          </p>
        </div>
      </section>

      <section className="surface detail-card">
        <h2>Recent requests</h2>
        {loading ? (
          <p className="empty-line">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="empty-line">No open leave requests for {employee.name}.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            {requests.slice(0, 3).map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  background: "#F5F5F4",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <b>{r.timeOffType?.name || "Leave"}</b>
                  <p style={{ margin: 0, color: "#78716C", fontSize: "12px" }}>
                    {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
