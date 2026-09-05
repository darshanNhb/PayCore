"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Empty } from "@/components/ui/empty";
import { MoreHorizontal } from "lucide-react";
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
            <td>
              <Link href={`/employees/${e.id}`} className="more" aria-label="Employee options">
                <MoreHorizontal size={18} />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
