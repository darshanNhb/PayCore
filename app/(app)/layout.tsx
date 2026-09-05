"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, PanelLeftClose, LogOut, Settings, Search } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav-config";
import { hasPermission } from "@/lib/auth/permissions";
import { UserRole } from "@prisma/client";

// Simplified type for the session user returned by /api/auth/me
type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employee?: {
    employeeCode: string;
    department: { name: string };
    jobPosition: { title: string };
  };
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.user.role === "EMPLOYEE") {
            // Employee role shouldn't be in the main app shell, redirect to portal
            router.push("/portal");
          }
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const activeRole = previewRole || user?.role || "ADMIN";

  // Filter nav groups based on active role permissions
  const visibleNavGroups = NAV_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) => {
      if (!item.requiredPermission) return true;
      return hasPermission(
        activeRole,
        item.requiredPermission.resource,
        item.requiredPermission.action
      );
    });
    return { ...group, items: visibleItems };
  }).filter((group) => group.items.length > 0);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center bg-[#FAFAF9]">Loading PayCore...</div>;
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">P</span>
          {!collapsed && <span>paycore</span>}
          <button
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {visibleNavGroups.map((group) => (
          <div className="nav-group" key={group.group}>
            {!collapsed && <label>{group.group}</label>}
            {group.items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={pathname.startsWith(item.href) ? "nav-active" : ""}
                title={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: "11px",
                  padding: "10px",
                  borderRadius: "8px",
                  color: pathname.startsWith(item.href) ? "#fff" : "#c3c1d3",
                  textAlign: "left",
                  margin: "2px 0",
                  position: "relative",
                  textDecoration: "none",
                  backgroundColor: pathname.startsWith(item.href) ? "#2d2a4d" : "transparent"
                }}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <Link href="/settings/users" style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px", borderRadius: "8px", color: pathname.startsWith("/settings") ? "#fff" : "#c3c1d3", textDecoration: "none", backgroundColor: pathname.startsWith("/settings") ? "#2d2a4d" : "transparent" }}>
            <Settings size={18} />
            {!collapsed && "Settings"}
          </Link>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors">
            <LogOut size={18} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <header className="topbar">
          <div className="search">
            <Search size={17} />
            <input placeholder="Search employees, payslips, contracts…" />
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Notifications">
              <Bell size={18} />
              <i className="notify" />
            </button>
            
            {user.role === "ADMIN" && (
              <select
                value={activeRole}
                onChange={(e) => {
                  const selected = e.target.value as UserRole;
                  if (selected === "EMPLOYEE") {
                    router.push("/portal");
                  } else {
                    setPreviewRole(selected);
                  }
                }}
                aria-label="Viewing role"
              >
                <option value="ADMIN">Admin</option>
                <option value="HR_PAYROLL_MANAGER">HR Payroll Manager</option>
                <option value="HR_PAYROLL_USER">HR Payroll User</option>
                <option value="HR_MANAGER">HR Manager</option>
                <option value="EMPLOYEE">Employee Portal</option>
              </select>
            )}

            <div className="user-chip">
              <span>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
              <div>
                <b>{user.firstName}</b>
                <small>{activeRole.replace(/_/g, " ")}</small>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="page">{children}</div>
      </main>
    </div>
  );
}
