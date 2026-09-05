import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import React from "react";

interface KpiCardProps {
  label: string;
  value: string;
  trend: string; // e.g. "+8.5% vs last month"
  icon: React.ReactNode;
}

export function KpiCard({ label, value, trend, icon }: KpiCardProps) {
  const isUp = trend.startsWith("+");
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small className={isUp ? "trend up" : "trend down"}>
        {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend}
      </small>
    </div>
  );
}
