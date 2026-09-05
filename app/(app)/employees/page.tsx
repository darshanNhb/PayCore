"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { EmployeeTable } from "@/features/employees/employee-table";
import { EmployeeKanban } from "@/features/employees/employee-kanban";
import { NewEmployeeModal } from "@/features/employees/new-employee-modal";
import { EmployeeListItem, DepartmentOption } from "@/features/employees/types";

export default function EmployeesPage() {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch departments
  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((d) => d.data && setDepartments(d.data))
      .catch(() => {});
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (departmentId) params.set("departmentId", departmentId);
    if (status) params.set("status", status);

    fetch(`/api/employees?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) setEmployees(d.data);
      })
      .catch((err) => console.error("Failed to load employees:", err))
      .finally(() => setLoading(false));
  }, [search, departmentId, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            People <ChevronRight size={13} /> Employees
          </div>
          <h1>Employees</h1>
          <p>{employees.length} people across your organisation.</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={17} /> New employee
        </button>
      </div>

      <div className="surface table-shell">
        <div className="table-toolbar">
          <div className="mini-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
            />
          </div>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <div className="view-toggle">
            <button
              onClick={() => setView("list")}
              className={view === "list" ? "selected" : ""}
            >
              List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={view === "kanban" ? "selected" : ""}
            >
              Board
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading employees...
          </div>
        ) : view === "list" ? (
          <EmployeeTable data={employees} />
        ) : (
          <EmployeeKanban data={employees} />
        )}
      </div>

      <NewEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEmployees}
      />
    </>
  );
}
