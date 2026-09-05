"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Shield, UserX, Check } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/users?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setUsers(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to change role");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} user`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="page-head" style={{ marginBottom: "24px" }}>
        <div>
          <div className="crumb">
            Settings <ChevronRight size={13} /> Users & Roles
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>Users & Roles</h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>Manage system access and roles for all registered accounts.</p>
        </div>
      </div>

      <div className="surface table-shell">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading users...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Linked Employee</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Avatar initials={u.firstName.charAt(0) + u.lastName.charAt(0)} color="#e2e8f0" small />
                      <div>
                        <div style={{ fontWeight: 500, color: "#1e293b" }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="HR_MANAGER">HR Manager</option>
                      <option value="HR_PAYROLL_USER">Payroll User</option>
                      <option value="HR_PAYROLL_MANAGER">Payroll Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td style={{ color: u.employeeId ? "#1e293b" : "#94a3b8" }}>
                    {u.employeeId ? "Yes" : "None"}
                  </td>
                  <td>
                    {u.isActive ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16a34a", fontSize: "12px", fontWeight: 500 }}>
                        <Check size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "12px", fontWeight: 500 }}>
                        <UserX size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "white",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: u.isActive ? "#dc2626" : "#16a34a",
                        cursor: "pointer",
                      }}
                    >
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
