"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
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
                style={{ textDecoration: "none", textAlign: "left" }}
              >
                <Avatar initials={e.initials} color={e.avatarColor} />
                <b>{e.name}</b>
                <small>{e.jobPosition}</small>
                <StatusPill status={e.status} />
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
