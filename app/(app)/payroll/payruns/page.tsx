"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Download,
  AlertCircle,
  X,
  ArrowUpRight,
  ChevronRight,
  Mail,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { StepTracker } from "@/components/ui/step-tracker";
import { SeverityCard } from "@/components/ui/severity-card";
import { formatCurrency } from "@/lib/utils/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PayrollRunsPage() {
  const [payruns, setPayruns] = useState<any[]>([]);
  const [activePayrun, setActivePayrun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0); // 0 = closed, 1 = scope, 2 = review
  const [structures, setStructures] = useState<any[]>([]);
  const [wizardForm, setWizardForm] = useState({
    name: "October 2026 monthly payroll",
    salaryStructureId: "",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    employeeTypeScope: "ALL",
  });
  const [eligibleEmployees, setEligibleEmployees] = useState<any[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [checkingScope, setCheckingScope] = useState(false);

  const loadPayruns = useCallback(() => {
    setLoading(true);
    fetch("/api/payroll/payruns")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setPayruns(d.data);
          // Load detail for the most recent or active payrun
          return fetch(`/api/payroll/payruns/${d.data[0].id}`);
        }
        return null;
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d?.data) setActivePayrun(d.data);
      })
      .catch((err) => console.error("Error loading payruns:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPayruns();
  }, [loadPayruns]);

  useEffect(() => {
    if (wizardStep === 1) {
      fetch("/api/payroll/structures")
        .then((r) => r.json())
        .then((d) => {
          if (d.data && d.data.length > 0) {
            setStructures(d.data);
            setWizardForm((prev) => ({ ...prev, salaryStructureId: d.data[0].id }));
          }
        });
    }
  }, [wizardStep]);

  // Wizard Step 1 -> Step 2 transition
  const handleProceedToStep2 = async () => {
    setCheckingScope(true);
    try {
      const res = await fetch("/api/payroll/payruns/draft-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to check scope");

      const list = data.data.eligibleEmployees || [];
      setEligibleEmployees(list);
      setSelectedEmpIds(list.filter((e: any) => e.hasRunningContract).map((e: any) => e.id));
      setWizardStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCheckingScope(false);
    }
  };

  // Wizard Step 2 finalize
  const handleCreatePayrun = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/payroll/payruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...wizardForm,
          employeeIds: selectedEmpIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create payrun");

      setWizardStep(0);
      loadPayruns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Pipeline actions
  const handleCompute = async () => {
    if (!activePayrun) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/payruns/${activePayrun.id}/compute`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Compute failed");
      loadPayruns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!activePayrun) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/payruns/${activePayrun.id}/validate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Validation failed");
      loadPayruns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!activePayrun) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/payruns/${activePayrun.id}/mark-paid`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Mark paid failed");
      loadPayruns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPayslips = async () => {
    if (!activePayrun) return;
    if (!confirm(`Send payslip emails to all ${activePayrun.employeeCount} employees in this payrun?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/payruns/${activePayrun.id}/send-payslips`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to send payslips");
      alert(data.data.message);
      loadPayruns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "DRAFT":
        return 0;
      case "COMPUTED":
        return 1;
      case "VALIDATED":
        return 2;
      case "PAID":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Payroll &gt; Payroll runs</div>
          <h1>Payroll runs</h1>
          <p>Manage every pay cycle from inputs to payout.</p>
        </div>
        <button className="primary" onClick={() => setWizardStep(1)}>
          <Plus size={17} /> New payrun
        </button>
      </div>

      <div className="month-strip">
        {MONTHS.map((m, i) => {
          // Find payrun(s) for this month in the current year
          const monthPayruns = payruns.filter((pr) => {
            const start = new Date(pr.periodStart);
            return start.getMonth() === i && start.getFullYear() === new Date().getFullYear();
          });
          const paidRun = monthPayruns.find((pr) => pr.status === "PAID");
          const activeRun = monthPayruns.find((pr) => pr.status !== "PAID" && pr.status !== "CANCELLED");
          const isDone = !!paidRun;
          const isCurrent = !isDone && !!activeRun;

          return (
            <button
              key={m}
              className={isDone ? "done" : isCurrent ? "current" : ""}
              onClick={() => {
                if (activeRun) {
                  // Load this payrun as active
                  fetch(`/api/payroll/payruns/${activeRun.id}`)
                    .then((r) => r.json())
                    .then((d) => d?.data && setActivePayrun(d.data));
                } else if (paidRun) {
                  fetch(`/api/payroll/payruns/${paidRun.id}`)
                    .then((r) => r.json())
                    .then((d) => d?.data && setActivePayrun(d.data));
                } else {
                  setWizardStep(1);
                }
              }}
            >
              {isDone && <Check size={14} />}
              <b>{m}</b>
              <small>
                {isDone
                  ? "Completed"
                  : isCurrent
                  ? "Current"
                  : "Upcoming"}
              </small>
              {isCurrent && activeRun && (
                <span>{activeRun.employeeCount} people{activeRun.warningsCount > 0 ? ` · ${activeRun.warningsCount} alerts` : ""}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading && !activePayrun ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          Loading payroll runs...
        </div>
      ) : !activePayrun ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          No active payroll run found. Click &quot;New payrun&quot; to begin.
        </div>
      ) : (
        <section className="surface run-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">
                {new Date(activePayrun.periodStart).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                }).toUpperCase()}
              </span>
              <h2>{activePayrun.name}</h2>
              <p>
                {new Date(activePayrun.periodStart).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                –{" "}
                {new Date(activePayrun.periodEnd).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                <span className="dot-sep">•</span> {activePayrun.employeeCount} employees
              </p>
            </div>
            <StatusPill status={activePayrun.status} />
          </div>

          <StepTracker current={getStepIndex(activePayrun.status)} />

          <div className="run-bottom">
            <div>
              <b>{formatCurrency(activePayrun.totalNet)}</b>
              <span>Estimated net payroll</span>
            </div>

            <div className="run-actions">
              {activePayrun.status === "DRAFT" && (
                <button
                  className="primary"
                  onClick={handleCompute}
                  disabled={actionLoading}
                >
                  <Calculator size={16} /> Compute payroll
                </button>
              )}

              {activePayrun.status === "COMPUTED" && (
                <button
                  className="primary"
                  onClick={handleValidate}
                  disabled={actionLoading}
                >
                  <ShieldCheck size={16} /> Validate payroll
                </button>
              )}

              {activePayrun.status === "VALIDATED" && (
                <button
                  className="primary"
                  onClick={handleMarkPaid}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} /> Mark paid
                </button>
              )}

              {activePayrun.status === "PAID" && (
                <button
                  className="primary"
                  onClick={handleSendPayslips}
                  disabled={actionLoading}
                >
                  <Mail size={16} /> {actionLoading ? "Sending..." : "Send payslips"}
                </button>
              )}

              <Link
                href={`/payroll/payslips?payrunId=${activePayrun.id}`}
                className="secondary"
                style={{ textDecoration: "none" }}
              >
                View payslips
              </Link>
            </div>
          </div>

          {activePayrun.warningsCount > 0 && (
            <div className="run-alert">
              <SeverityCard
                type="warning"
                title={`${activePayrun.warningsCount} payslip(s) have warnings`}
                description="Review payslips to check for missing bank details, duplicates, or other issues."
                action="View payslips"
                onClick={() => (window.location.href = `/payroll/payslips?payrunId=${activePayrun.id}`)}
              />
            </div>
          )}
        </section>
      )}

      {/* Payrun Wizard Modal */}
      {wizardStep > 0 && (
        <div className="modal-back">
          <section className="modal">
            <button
              className="modal-close"
              onClick={() => setWizardStep(0)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="eyebrow">NEW PAYRUN · STEP {wizardStep} OF 2</span>
            <h2>{wizardStep === 1 ? "Choose your payroll period" : "Review payroll run"}</h2>

            {wizardStep === 1 ? (
              <>
                <p>Set the period and people before creating this payroll run.</p>
                <div className="form-grid" style={{ marginTop: "16px" }}>
                  <label>
                    Payrun name *
                    <input
                      required
                      value={wizardForm.name}
                      onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Salary Structure *
                    <select
                      value={wizardForm.salaryStructureId}
                      onChange={(e) => setWizardForm({ ...wizardForm, salaryStructureId: e.target.value })}
                    >
                      {structures.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Period start *
                    <input
                      type="date"
                      required
                      value={wizardForm.periodStart}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodStart: e.target.value })}
                    />
                  </label>
                  <label>
                    Period end *
                    <input
                      type="date"
                      required
                      value={wizardForm.periodEnd}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodEnd: e.target.value })}
                    />
                  </label>
                </div>

                <p className="callout">
                  <AlertCircle size={16} /> Continuing does not create a payrun. You&apos;ll review eligible employees in the next step.
                </p>

                <footer>
                  <button type="button" className="secondary" onClick={() => setWizardStep(0)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleProceedToStep2}
                    disabled={checkingScope}
                  >
                    {checkingScope ? "Checking..." : "Continue"} <ChevronRight size={16} />
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className="review-box" style={{ marginTop: "16px" }}>
                  <span>Period</span>
                  <b>
                    {wizardForm.periodStart} to {wizardForm.periodEnd}
                  </b>
                  <span>Eligible Employees</span>
                  <b>{selectedEmpIds.length} employees with running contracts</b>
                  <span>Salary Structure</span>
                  <b>{structures.find((s) => s.id === wizardForm.salaryStructureId)?.name || "Standard"}</b>
                </div>

                <p className="callout">
                  <CheckCircle2 size={16} /> Payrun and draft payslips will be generated for the {selectedEmpIds.length} confirmed employees.
                </p>

                <footer>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setWizardStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleCreatePayrun}
                    disabled={actionLoading || selectedEmpIds.length === 0}
                  >
                    {actionLoading ? "Creating..." : "Create payrun"} <ArrowUpRight size={16} />
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
