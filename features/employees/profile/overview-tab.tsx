"use client";

import { StatusPill } from "@/components/ui/status-pill";
import { Banknote, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface OverviewTabProps {
  employee: any;
  onNavigateTab: (tab: string) => void;
}

export function OverviewTab({ employee, onNavigateTab }: OverviewTabProps) {
  const contract = employee.currentContract;
  const wage = contract ? Number(contract.wagePerMonth) : 0;
  const estimatedNet = wage ? Math.round(wage * 0.82) : 0;

  return (
    <div className="profile-grid">
      <section className="surface detail-card">
        <h2>Work information</h2>
        <dl>
          <dt>Department</dt>
          <dd>{employee.department?.name || "—"}</dd>

          <dt>Manager</dt>
          <dd>
            {employee.manager
              ? `${employee.manager.firstName} ${employee.manager.lastName}`
              : "—"}
          </dd>

          <dt>Job position</dt>
          <dd>{employee.jobPosition?.title || "—"}</dd>

          <dt>Work email</dt>
          <dd>{employee.workEmail}</dd>

          <dt>Work location</dt>
          <dd>{employee.workLocation || "Bengaluru, India"}</dd>

          <dt>Company</dt>
          <dd>PayCore India Pvt. Ltd.</dd>

          <dt>Working schedule</dt>
          <dd>
            <span style={{ color: "#4F46E5", fontWeight: 500 }}>
              {employee.workingSchedule?.name || "India — Standard 40h"}
            </span>
          </dd>

          <dt>Bank details</dt>
          <dd>
            {employee.bankVerified ? (
              <span style={{ color: "#16A34A", fontWeight: 500 }}>
                Verified ({employee.bankAccountMasked})
              </span>
            ) : (
              <span style={{ color: "#D97706" }}>Not verified</span>
            )}
          </dd>

          <dt>Status</dt>
          <dd>
            <StatusPill status={employee.status} />
          </dd>
        </dl>
      </section>

      <div className="stack">
        <section className="surface contract-summary">
          <div className="section-title">
            <h2>Current contract</h2>
            <StatusPill status={contract ? contract.status : "No Contract"} />
          </div>

          <strong>
            {formatCurrency(wage)} <small>/ month</small>
          </strong>

          <p>
            {contract?.startDate
              ? new Date(contract.startDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}{" "}
            <span className="dot-sep">•</span>{" "}
            {contract?.endDate
              ? new Date(contract.endDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Ongoing"}
          </p>

          <div>
            <span>{contract?.salaryStructure?.name || "Standard INR — Monthly"}</span>
            <button
              className="text-button"
              onClick={() => onNavigateTab("Employment")}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              View contracts <ChevronRight size={14} />
            </button>
          </div>

          <aside>
            <Banknote size={16} />
            <span>
              This running contract is the source for payroll calculation in the active period.
            </span>
          </aside>
        </section>

        <section className="surface month-summary">
          <h2>This month</h2>
          <div>
            <span>
              <b>21</b>Present days
            </span>
            <span>
              <b className="amber-text">1</b>Late days
            </span>
            <span>
              <b>0</b>Leave days
            </span>
            <span>
              <b>{formatCurrency(estimatedNet)}</b>Est. Net salary
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
