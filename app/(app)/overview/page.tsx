"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  WalletCards,
  Users,
  CircleDollarSign,
  ShieldCheck,
  Gauge,
  Plus,
  ChevronRight,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { SeverityCard } from "@/components/ui/severity-card";
import { StatusPill } from "@/components/ui/status-pill";
import { StepTracker } from "@/components/ui/step-tracker";
import { formatCurrency } from "@/lib/utils/format";

export default function OverviewPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setData(d.data);
      })
      .catch((err) => console.error("Error loading dashboard metrics:", err))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis || {
    totalEmployees: 248,
    netPayrollThisMonth: 1842860,
    pendingApprovals: 6,
    attendanceHealth: "96.8%",
  };

  const activity = data?.recentActivity || [];

  const activeRole = data?.user?.role || "EMPLOYEE";

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">FRIDAY, 18 SEPTEMBER 2026</p>
          <h1>Good morning, {data?.user?.firstName || "there"}</h1>
          <p>
            September 2026 Payroll <span className="dot-sep">•</span> Processing
          </p>
        </div>
        {["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
          <Link
            href="/payroll/payruns"
            className="secondary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <WalletCards size={17} /> Open payrun
          </Link>
        )}
      </div>

      <section className="attention">
        <div className="section-title">
          <div>
            <h2>Needs your attention</h2>
            <p>Resolve these before payroll can move forward.</p>
          </div>
          {["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <Link
              href="/payroll/payruns"
              className="text-button"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              View all <ChevronRight size={16} />
            </Link>
          )}
        </div>

        <div className="attention-grid">
          {["ADMIN", "HR_MANAGER", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <SeverityCard
              type="blocker"
              title={`${data?.alerts?.missingBankCount || 2} employees missing bank details`}
              description="Blocks payslip finalisation for September."
              action="Review"
              onClick={() => (window.location.href = "/employees")}
            />
          )}
          {["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <SeverityCard
              type="warning"
              title="Duplicate payslip detected"
              description="Aarav Mehta appears twice in September run."
              action="Review"
              onClick={() => (window.location.href = "/payroll/payslips")}
            />
          )}
          {["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <SeverityCard
              type="deadline"
              title="Validate September payrun"
              description="Validation is due in 10 days, by 28 Sep."
              action="Open"
              onClick={() => (window.location.href = "/payroll/payruns")}
            />
          )}
          <SeverityCard
            type="info"
            title="245 of 248 employees ready"
            description="Three records need a final review."
          />
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard
          label="Total employees"
          value={String(kpis.totalEmployees)}
          trend="+8.5% vs last month"
          icon={<Users size={17} />}
        />
        <KpiCard
          label="Net payroll this month"
          value={`₹${(kpis.netPayrollThisMonth / 100000).toFixed(1)}L`}
          trend="+3.2% vs last month"
          icon={<CircleDollarSign size={17} />}
        />
        <KpiCard
          label="Pending approvals"
          value={String(kpis.pendingApprovals).padStart(2, "0")}
          trend="2 need attention"
          icon={<ShieldCheck size={17} />}
        />
        <KpiCard
          label="Attendance health"
          value={kpis.attendanceHealth}
          trend="+1.4% vs last month"
          icon={<Gauge size={17} />}
        />
      </section>

      <section className="progress-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">CURRENT PAYROLL CYCLE</span>
            <h2>September 2026</h2>
          </div>
          <StatusPill status="Processing" />
        </div>
        <StepTracker current={2} />
      </section>

      <div className="two-col">
        <section className="surface activity">
          <div className="section-title">
            <h2>Recent activity</h2>
            <button className="text-button">All activity</button>
          </div>
          {activity.map((act: any) => (
            <div className="activity-row" key={act.id}>
              <span>{act.time}</span>
              <i />
              <div>
                <b>{act.title}</b>
                <p>{act.detail}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="surface quick">
          <span className="eyebrow">WORK FASTER</span>
          <h2>Quick actions</h2>
          <p>Common payroll tasks, right where you need them.</p>

          {["ADMIN", "HR_MANAGER", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <Link
              href="/employees"
              className="quick-action"
              style={{ textDecoration: "none" }}
            >
              <span>
                <Plus size={17} /> New employee
              </span>
              <ChevronRight size={17} />
            </Link>
          )}

          {["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <Link
              href="/payroll/payruns"
              className="quick-action"
              style={{ textDecoration: "none" }}
            >
              <span>
                <Plus size={17} /> New payrun
              </span>
              <ChevronRight size={17} />
            </Link>
          )}

          {["ADMIN", "HR_MANAGER", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER"].includes(activeRole) && (
            <Link
              href="/time-off/requests"
              className="quick-action"
              style={{ textDecoration: "none" }}
            >
              <span>
                <ShieldCheck size={17} /> Review approvals
              </span>
              <ChevronRight size={17} />
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
