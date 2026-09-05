import Link from "next/link";
import {
  Users,
  Clock,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "PayCore — HR & Payroll Platform",
  description:
    "The calm operating system for people and pay. Manage employees, contracts, attendance, time off, and payroll — all in one connected platform.",
};

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow effects */}
      <div
        style={{
          position: "fixed",
          top: "-200px",
          right: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-300px",
          left: "-200px",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            P
          </div>
          <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>
            PayCore
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "80px 24px 60px",
          position: "relative",
          zIndex: 10,
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            marginBottom: "28px",
          }}
        >
          HR & PAYROLL PLATFORM
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 60px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: "20px",
            background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Clear operations.
          <br />
          Confident decisions.
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#94a3b8",
            maxWidth: "520px",
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          One connected record from onboarding to payslip. Manage your entire
          workforce — employees, contracts, attendance, time off, and payroll.
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1, #7c3aed)",
            color: "#fff",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: 600,
            boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
            transition: "all 0.2s",
          }}
        >
          Get Started <ArrowRight size={18} />
        </Link>
      </section>

      {/* Features Grid */}
      <section
        style={{
          padding: "40px 48px 80px",
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {[
            {
              icon: Users,
              title: "Employee Management",
              desc: "Complete employee lifecycle — from onboarding to offboarding with rich profiles and org charts.",
              color: "#6366f1",
            },
            {
              icon: Clock,
              title: "Attendance & Time Off",
              desc: "Real-time check-in/out tracking, leave requests, allocations, and automated balance management.",
              color: "#8b5cf6",
            },
            {
              icon: DollarSign,
              title: "Payroll Engine",
              desc: "Configurable salary structures, rule-based computation, batch payrun processing, and PDF payslips.",
              color: "#06b6d4",
            },
            {
              icon: BarChart3,
              title: "Analytics Dashboard",
              desc: "Real-time insights into headcount, payroll costs, attendance rates, and departmental breakdowns.",
              color: "#10b981",
            },
            {
              icon: Shield,
              title: "Role-Based Access",
              desc: "5-tier RBAC — Admin, HR Payroll Manager, HR Payroll User, HR Manager, and Employee self-service.",
              color: "#f59e0b",
            },
            {
              icon: CheckCircle2,
              title: "Audit & Compliance",
              desc: "Full audit trail on every action. Encrypted bank details, rate limiting, and security headers.",
              color: "#ef4444",
            },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                padding: "28px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${f.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "#e2e8f0",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "#475569",
          fontSize: "13px",
          position: "relative",
          zIndex: 10,
        }}
      >
        PayCore © 2026 — Built for modern HR teams.
      </footer>
    </main>
  );
}
