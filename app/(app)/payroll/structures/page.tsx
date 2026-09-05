"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

export default function SalaryStructuresPage() {
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/payroll/structures")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setStructures(d.data);
      })
      .catch((err) => console.error("Error loading structures:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create structure");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Payroll &gt; Salary structures</div>
          <h1>Salary structures</h1>
          <p>Define salary packages and assignable rule sets.</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={17} /> New structure
        </button>
      </div>

      <div className="surface table-shell">
        <div className="table-toolbar">
          <b>All Structures ({structures.length})</b>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading structures...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Rules Count</th>
                <th>Active Contracts</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                  </td>
                  <td>{s.description || "—"}</td>
                  <td>{s.rules?.length || 0} rules</td>
                  <td>{s._count?.contracts || 0} employees</td>
                  <td>
                    <StatusPill status={s.status} />
                  </td>
                  <td>
                    <Link href="/payroll/rules" className="link-btn">
                      Configure rules <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-back">
          <section className="modal">
            <span className="eyebrow">NEW SALARY STRUCTURE</span>
            <h2>Create Salary Structure</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
              <label>
                Structure name *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Commission Structure"
                />
              </label>

              <label>
                Description
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe who this structure is for"
                />
              </label>

              <footer>
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create structure"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
