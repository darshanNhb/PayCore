"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Trash2 } from "lucide-react";
import { EmployeeListItem } from "./types";

interface EmployeeKanbanProps {
  data: EmployeeListItem[];
}

export function EmployeeKanban({ data }: EmployeeKanbanProps) {
  // Extract unique departments dynamically or fallback to standard set
  const departmentNames = Array.from(new Set(data.map((e) => e.department).filter(Boolean)));
  if (departmentNames.length === 0) {
    departmentNames.push("Engineering", "Product", "People", "Revenue");
  }

  return (
    <div className="kanban">
      {departmentNames.map((dept) => {
        const deptEmployees = data.filter((e) => e.department === dept);
        return (
          <div className="kanban-col" key={dept}>
            <div>
              <b>{dept}</b>
              <span>{deptEmployees.length}</span>
            </div>
            {deptEmployees.map((e) => (
              <Link
                key={e.id}
                href={`/employees/${e.id}`}
                className="person-card"
                style={{ textDecoration: "none", textAlign: "left", position: "relative" }}
              >
                <Avatar initials={e.initials} color={e.avatarColor} />
                <b>{e.name}</b>
                <small>{e.jobPosition}</small>
                <StatusPill status={e.status} />
                {e.workEmail !== "buddhdevdarshan1478@gmail.com" && (
                  <button
                    type="button"
                    aria-label="Delete employee"
                    style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0 }}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
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
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
