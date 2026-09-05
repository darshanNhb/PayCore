"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Empty } from "@/components/ui/empty";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { EmployeeListItem } from "./types";

interface EmployeeTableProps {
  data: EmployeeListItem[];
}

export function EmployeeTable({ data }: EmployeeTableProps) {
  if (!data.length) {
    return <Empty title="No employees found" />;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Employee</th>
          <th>Work email</th>
          <th>Job position</th>
          <th>Department</th>
          <th>Manager</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {data.map((e) => (
          <tr key={e.id}>
            <td>
              <Link href={`/employees/${e.id}`} className="employee-cell" style={{ textDecoration: "none", color: "inherit" }}>
                <Avatar initials={e.initials} color={e.avatarColor} small />
                <b>{e.name}</b>
              </Link>
            </td>
            <td>{e.workEmail}</td>
            <td>{e.jobPosition}</td>
            <td>{e.department}</td>
            <td>{e.manager}</td>
            <td>
              <StatusPill status={e.status} />
            </td>
            <td style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end", paddingRight: "16px" }}>
              <Link href={`/employees/${e.id}`} className="more" aria-label="Employee options" style={{ color: "#6B7280" }}>
                <MoreHorizontal size={18} />
              </Link>
              {e.workEmail !== "buddhdevdarshan1478@gmail.com" && (
                <button
                  type="button"
                  aria-label="Delete employee"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0, display: "flex" }}
                  onClick={async (ev) => {
                    ev.preventDefault();
                    if (!confirm(`Are you sure you want to delete ${e.name}?`)) return;
                    try {
                      const res = await fetch(`/api/employees/${e.id}`, { method: "DELETE" });
                      if (res.ok) {
                        window.location.reload();
                      } else {
                        const data = await res.json();
                        alert(data.error?.message || "Failed to delete employee");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("An error occurred");
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
