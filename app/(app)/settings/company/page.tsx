"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Save } from "lucide-react";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "PayCore India Pvt. Ltd.",
    legalName: "PayCore Technologies",
    timezone: "Asia/Kolkata",
    currency: "INR",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In a real app, this would hit /api/company
    setTimeout(() => {
      setLoading(false);
      alert("Company settings saved securely.");
    }, 800);
  };

  return (
    <>
      <div className="page-head" style={{ marginBottom: "24px" }}>
        <div>
          <div className="crumb">
            Settings <ChevronRight size={13} /> Company Profile
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>Company Profile</h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>Manage global company settings, localization, and branding.</p>
        </div>
      </div>

      <div className="surface" style={{ padding: "32px", maxWidth: "600px" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Company Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Legal Entity Name</label>
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Base Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Global Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Save size={16} /> {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
