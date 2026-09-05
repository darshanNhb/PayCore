"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Shield, Building2 } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: "/settings/users", label: "Users & Roles", icon: Users },
    { href: "/settings/company", label: "Company Profile", icon: Building2 },
  ];

  return (
    <div className="settings-layout" style={{ display: "flex", gap: "32px", padding: "32px", height: "100%" }}>
      <aside style={{ width: "240px", flexShrink: 0 }}>
        <div style={{ position: "sticky", top: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "24px", color: "#1e293b" }}>Settings</h2>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: isActive ? "#4f46e5" : "#475569",
                    backgroundColor: isActive ? "#eef2ff" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, maxWidth: "1000px" }}>
        {children}
      </main>
    </div>
  );
}
