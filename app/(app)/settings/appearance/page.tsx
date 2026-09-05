"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="surface" style={{ padding: "32px", minHeight: "60vh" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>Appearance</h1>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "14px" }}>
          Customize how PayCore looks on your device.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", maxWidth: "600px" }}>
        <button
          onClick={() => setTheme("light")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "24px",
            borderRadius: "12px",
            border: `2px solid ${theme === "light" ? "var(--primary)" : "var(--border)"}`,
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#0f172a" }}>
            <Sun size={24} />
          </div>
          <span style={{ fontWeight: 600 }}>Light</span>
        </button>

        <button
          onClick={() => setTheme("dark")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "24px",
            borderRadius: "12px",
            border: `2px solid ${theme === "dark" ? "var(--primary)" : "var(--border)"}`,
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1e293b", display: "grid", placeItems: "center", color: "#f8fafc" }}>
            <Moon size={24} />
          </div>
          <span style={{ fontWeight: 600 }}>Dark</span>
        </button>

        <button
          onClick={() => setTheme("system")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "24px",
            borderRadius: "12px",
            border: `2px solid ${theme === "system" ? "var(--primary)" : "var(--border)"}`,
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
            <Monitor size={24} />
          </div>
          <span style={{ fontWeight: 600 }}>System</span>
        </button>
      </div>
    </div>
  );
}
