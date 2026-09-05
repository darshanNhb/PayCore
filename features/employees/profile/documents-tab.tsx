"use client";

import { FileText, Download } from "lucide-react";

export function DocumentsTab() {
  const docs = [
    { name: "Offer Letter.pdf", status: "Verified document" },
    { name: "Current Contract.pdf", status: "Updated 01 Apr 2026" },
    { name: "PAN Card.pdf", status: "Verified document" },
    { name: "ID Proof.pdf", status: "Verified document" },
  ];

  return (
    <section className="surface detail-card">
      <h2>Employee documents</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
        {docs.map((d) => (
          <div className="doc" key={d.name}>
            <FileText size={20} style={{ color: "#4F46E5" }} />
            <span>
              <b>{d.name}</b>
              <small>{d.status}</small>
            </span>
            <button
              className="secondary"
              onClick={() => alert(`Downloading ${d.name}`)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={15} /> Download
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
