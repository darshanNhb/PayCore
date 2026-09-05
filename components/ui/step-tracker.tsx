import { Check } from "lucide-react";

interface StepTrackerProps {
  steps?: string[];
  current?: number;
}

export function StepTracker({
  steps = ["Inputs", "Calculate", "Validate", "Approve", "Paid"],
  current = 2,
}: StepTrackerProps) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div className="step" key={s}>
          {i > 0 && (
            <span
              className={i <= current ? "step-line active" : "step-line"}
            />
          )}
          <span
            className={`step-dot ${
              i < current ? "done" : i === current ? "current" : ""
            }`}
          >
            {i < current ? <Check size={13} /> : i + 1}
          </span>
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}
