"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ChevronRight, FileText, CalendarDays, FolderOpen, Banknote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { OverviewTab } from "@/features/employees/profile/overview-tab";
import { ContractsTab } from "@/features/employees/profile/contracts-tab";
import { AttendanceTab } from "@/features/employees/profile/attendance-tab";
import { LeaveTab } from "@/features/employees/profile/leave-tab";
import { PayrollTab } from "@/features/employees/profile/payroll-tab";
import { DocumentsTab } from "@/features/employees/profile/documents-tab";
import { EditEmployeeModal } from "@/features/employees/edit-employee-modal";

interface EmployeeProfilePageProps {
  params: Promise<{ employeeId: string }>;
}

export default function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const { employeeId } = use(params);
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>({
    contractsCount: 0,
    attendanceThisMonth: 0,
    timeOffRequestsCount: 0,
    activeAllocationsCount: 0,
  });
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/employees/${employeeId}`).then((r) => r.json()),
      fetch(`/api/employees/${employeeId}/summary`).then((r) => r.json()),
    ])
      .then(([empRes, sumRes]) => {
        if (empRes.data) setEmployee(empRes.data);
        if (sumRes.data) setSummary(sumRes.data);
      })
      .catch((err) => console.error("Error loading employee profile:", err))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !employee) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#78716C" }}>
        Loading employee profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#EF4444" }}>
        Employee not found.
      </div>
    );
  }

  const tabs = ["Overview", "Employment", "Time", "Leave", "Payroll", "Documents"];

  return (
    <>
      <div className="crumb">
        <Link href="/employees" style={{ color: "inherit", textDecoration: "none" }}>
          People
        </Link>{" "}
        <ChevronRight size={13} />{" "}
        <Link href="/employees" style={{ color: "inherit", textDecoration: "none" }}>
          Employees
        </Link>{" "}
        <ChevronRight size={13} /> {employee.name}
      </div>

      <section className="profile-hero">
        <div className="profile-main">
          <Avatar
            initials={employee.initials}
            color={employee.avatarColor || "bg-indigo-100 text-indigo-700"}
          />
          <div>
            <h1>{employee.name}</h1>
            <p>
              {employee.jobPosition?.title || "Staff"} <span className="dot-sep">•</span>{" "}
              {employee.department?.name || "General"}
            </p>
            <StatusPill status={employee.status} />
          </div>
        </div>

        <button className="secondary" onClick={() => setEditOpen(true)}>
          Edit employee
        </button>

        <div className="smart-tiles">
          <button onClick={() => setTab("Employment")}>
            <FileText />
            <span>Contracts</span>
            <b>{summary.contractsCount}</b>
          </button>
          <button onClick={() => setTab("Time")}>
            <CalendarDays />
            <span>Attendance</span>
            <b>
              {summary.attendanceThisMonth} <small>this month</small>
            </b>
          </button>
          <button onClick={() => setTab("Leave")}>
            <FolderOpen />
            <span>Time off</span>
            <b>
              {summary.timeOffRequestsCount} <small>requests</small>
            </b>
          </button>
          <button onClick={() => setTab("Payroll")}>
            <Banknote />
            <span>Allocations</span>
            <b>
              {summary.activeAllocationsCount} <small>active</small>
            </b>
          </button>
        </div>
      </section>

      <div className="tabs">
        {tabs.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={tab === x ? "active" : ""}
          >
            {x}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <OverviewTab employee={employee} onNavigateTab={(t) => setTab(t)} />
      )}
      {tab === "Employment" && (
        <ContractsTab employee={employee} onRefresh={loadData} />
      )}
      {tab === "Time" && <AttendanceTab employee={employee} />}
      {tab === "Leave" && <LeaveTab employee={employee} />}
      {tab === "Payroll" && <PayrollTab employee={employee} />}
      {tab === "Documents" && <DocumentsTab />}

      <EditEmployeeModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={loadData}
        employee={employee}
      />
    </>
  );
}
