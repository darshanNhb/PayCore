"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Calculator, Check, AlertCircle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

interface SalaryRuleItem {
  id: string;
  name: string;
  code: string;
  category: string;
  sequence: number;
  computationMethod: "FIXED_AMOUNT" | "PERCENTAGE_OF_RULE" | "FORMULA";
  fixedAmount?: number | null;
  percentageOfRuleCode?: string | null;
  percentageValue?: number | null;
  formulaExpression?: string | null;
  salaryStructure: { id: string; name: string };
  active: boolean;
}

export default function SalaryRulesPage() {
  const [rules, setRules] = useState<SalaryRuleItem[]>([]);
  const [structures, setStructures] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "House rent allowance",
    code: "HRA",
    category: "ALLOWANCE",
    computationMethod: "PERCENTAGE_OF_RULE",
    sequence: 20,
    fixedAmount: "",
    percentageOfRuleCode: "BASIC",
    percentageValue: "50",
    formulaExpression: "BASIC * 0.5",
  });
  const [formulaTest, setFormulaTest] = useState<{ valid?: boolean; result?: number; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/payroll/structures")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setStructures(d.data);
          const currentId = selectedStructureId || d.data[0].id;
          if (!selectedStructureId) setSelectedStructureId(currentId);
          return fetch(`/api/payroll/rules?structureId=${currentId}`);
        }
        return null;
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d?.data) setRules(d.data);
      })
      .catch((err) => console.error("Failed loading rules:", err))
      .finally(() => setLoading(false));
  }, [selectedStructureId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTestFormula = async () => {
    if (!form.formulaExpression) return;
    try {
      const res = await fetch("/api/payroll/rules/validate-formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: form.formulaExpression,
          availableRuleCodes: ["BASIC", "HRA", "GROSS"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormulaTest({ valid: false, error: data.error?.message || "Invalid formula" });
      } else {
        setFormulaTest({ valid: true, result: data.data.sampleEvaluatedResult });
      }
    } catch (err: any) {
      setFormulaTest({ valid: false, error: err.message });
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        salaryStructureId: selectedStructureId,
        name: form.name,
        code: form.code.toUpperCase(),
        category: form.category,
        sequence: Number(form.sequence),
        computationMethod: form.computationMethod,
      };

      if (form.computationMethod === "FIXED_AMOUNT") {
        payload.fixedAmount = Number(form.fixedAmount);
      } else if (form.computationMethod === "PERCENTAGE_OF_RULE") {
        payload.percentageOfRuleCode = form.percentageOfRuleCode;
        payload.percentageValue = Number(form.percentageValue);
      } else if (form.computationMethod === "FORMULA") {
        payload.formulaExpression = form.formulaExpression;
      }

      const res = await fetch("/api/payroll/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create rule");
      }

      setIsModalOpen(false);
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
          <div className="crumb">Payroll &gt; Salary rules</div>
          <h1>Salary rules</h1>
          <p>Reusable calculations that flow into payslips.</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={17} /> New rule
        </button>
      </div>

      <div className="surface table-shell">
        <div className="table-toolbar">
          <b>Rules in Structure</b>
          <select
            value={selectedStructureId}
            onChange={(e) => setSelectedStructureId(e.target.value)}
          >
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            Loading salary rules...
          </div>
        ) : rules.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
            No rules found for this structure.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Seq</th>
                <th>Name</th>
                <th>Code</th>
                <th>Category</th>
                <th>Computation</th>
                <th>Calculation Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.sequence}</b>
                  </td>
                  <td>{r.name}</td>
                  <td>
                    <code style={{ background: "#F5F5F4", padding: "2px 6px", borderRadius: "4px" }}>
                      {r.code}
                    </code>
                  </td>
                  <td>{r.category}</td>
                  <td>{r.computationMethod.replace(/_/g, " ")}</td>
                  <td>
                    {r.computationMethod === "FIXED_AMOUNT"
                      ? `₹${r.fixedAmount?.toLocaleString("en-IN")}`
                      : r.computationMethod === "PERCENTAGE_OF_RULE"
                      ? `${r.percentageValue}% of ${r.percentageOfRuleCode}`
                      : `${r.formulaExpression}`}
                  </td>
                  <td>
                    <StatusPill status={r.active ? "ACTIVE" : "INACTIVE"} />
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
            <span className="eyebrow">NEW SALARY RULE</span>
            <h2>Create Salary Rule</h2>
            <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
              <div className="form-grid">
                <label>
                  Rule name *
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Rule code *
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Category *
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="BASIC">Basic</option>
                    <option value="ALLOWANCE">Allowance</option>
                    <option value="GROSS">Gross</option>
                    <option value="DEDUCTION">Deduction</option>
                    <option value="EMPLOYER_CONTRIBUTION">Employer Contribution</option>
                    <option value="NET">Net Pay</option>
                  </select>
                </label>
                <label>
                  Sequence *
                  <input
                    type="number"
                    required
                    value={form.sequence}
                    onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })}
                  />
                </label>
              </div>

              <label>
                Computation Method *
                <select
                  value={form.computationMethod}
                  onChange={(e) => setForm({ ...form, computationMethod: e.target.value as any })}
                >
                  <option value="PERCENTAGE_OF_RULE">Percentage of Rule</option>
                  <option value="FIXED_AMOUNT">Fixed Amount</option>
                  <option value="FORMULA">Formula Expression</option>
                </select>
              </label>

              {form.computationMethod === "FIXED_AMOUNT" && (
                <label>
                  Fixed Amount (₹) *
                  <input
                    type="number"
                    required
                    value={form.fixedAmount}
                    onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })}
                  />
                </label>
              )}

              {form.computationMethod === "PERCENTAGE_OF_RULE" && (
                <div className="form-grid">
                  <label>
                    Base Rule Code *
                    <input
                      required
                      value={form.percentageOfRuleCode}
                      onChange={(e) => setForm({ ...form, percentageOfRuleCode: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label>
                    Percentage (%) *
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={form.percentageValue}
                      onChange={(e) => setForm({ ...form, percentageValue: e.target.value })}
                    />
                  </label>
                </div>
              )}

              {form.computationMethod === "FORMULA" && (
                <div>
                  <label>
                    Formula Expression *
                    <input
                      required
                      value={form.formulaExpression}
                      onChange={(e) => setForm({ ...form, formulaExpression: e.target.value })}
                      placeholder="e.g. BASIC * 0.12"
                    />
                  </label>
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <button type="button" className="secondary" onClick={handleTestFormula}>
                      <Calculator size={14} /> Test formula
                    </button>
                    {formulaTest && (
                      <span style={{ fontSize: "12px", color: formulaTest.valid ? "#16A34A" : "#DC2626" }}>
                        {formulaTest.valid
                          ? `Valid! Sample result: ₹${formulaTest.result}`
                          : formulaTest.error}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="callout">
                <Calculator size={16} /> Sequence controls the execution and display order in the payslip.
              </p>

              <footer>
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save rule"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
