import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import React from "react";

type SeverityType = "blocker" | "warning" | "deadline" | "info";

interface SeverityCardProps {
  type: SeverityType;
  title: string;
  description: string;
  action?: string;
  onClick?: () => void;
}

export function SeverityCard({
  type,
  title,
  description,
  action,
  onClick,
}: SeverityCardProps) {
  const icon =
    type === "blocker" ? (
      <AlertCircle />
    ) : type === "warning" ? (
      <AlertCircle />
    ) : type === "deadline" ? (
      <CalendarDays />
    ) : (
      <CheckCircle2 />
    );

  return (
    <div className={`severity ${type}`}>
      <span className="severity-icon">{icon}</span>
      <div>
        <b>{title}</b>
        <p>{description}</p>
      </div>
      {action && (
        <button onClick={onClick} className="link-btn">
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
