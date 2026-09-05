"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  CircleDollarSign,
  BriefcaseBusiness,
  Users,
  Gauge,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";

export default function PayrollDashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setData(d.data);
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  const chartSeries = data?.chartSeries || [
    { m: "Apr", v: 15.8 },
    { m: "May", v: 16.2 },
    { m: "Jun", v: 16.1 },
    { m: "Jul", v: 17.3 },
    { m: "Aug", v: 17.8 },
    { m: "Sep", v: 18.4 },
  ];

  const departmentCost = data?.departmentCost || [
    { d: "Eng", v: 8.2 },
    { d: "Sales", v: 3.8 },
    { d: "Prod", v: 2.9 },
    { d: "Peop", v: 1.8 },
    { d: "Fin", v: 1.7 },
  ];

  const kpis = data?.kpis || {
    netPayrollThisMonth: 1842860,
    totalGrossThisMonth: 2470000,
    totalEmployees: 248,
    avgGrossSalary: 84720,
  };

  const health = data?.health || {
    attendanceComplete: 96,
    contractCoverage: 99,
    bankVerification: 94,
  };

  const headcountByDept = data?.headcountByDept || [
    { name: "Engineering", value: 45 },
    { name: "Sales", value: 30 },
    { name: "Product", value: 15 },
    { name: "People", value: 8 },
    { name: "Finance", value: 6 },
  ];

  const COLORS = ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF", "#4F46E5"];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            Insights <ChevronRight size={13} /> Payroll dashboard
          </div>
          <h1>Payroll dashboard</h1>
          <p>Connected insights from your active people and payroll records.</p>
        </div>
        <select className="select-alone">
          <option>FY 2026–27</option>
        </select>
      </div>

      <section className="kpi-grid">
        <KpiCard
          label="Net payroll"
          value={`₹${(kpis.netPayrollThisMonth / 100000).toFixed(1)}L`}
          trend="+3.2% vs Aug"
          icon={<CircleDollarSign size={17} />}
        />
        <KpiCard
          label="Total cost to company"
          value={`₹${(kpis.totalGrossThisMonth / 100000).toFixed(1)}L`}
          trend="+4.1% vs Aug"
          icon={<BriefcaseBusiness size={17} />}
        />
        <KpiCard
          label="Headcount"
          value={String(kpis.totalEmployees)}
          trend="+12 this quarter"
          icon={<Users size={17} />}
        />
        <KpiCard
          label="Avg. gross salary"
          value={`₹${kpis.avgGrossSalary.toLocaleString("en-IN")}`}
          trend="+1.8% vs Aug"
          icon={<Gauge size={17} />}
        />
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .chart-full {
          grid-column: 1 / -1;
        }
        @media (max-width: 1000px) {
          .charts-grid { grid-template-columns: 1fr; }
        }
      `}} />

      <div className="charts-grid">
        <section className="surface chart-card chart-full">
          <div className="section-title">
            <div>
              <h2>Payroll cost trend</h2>
              <p>Net payroll in lakhs</p>
            </div>
            <span className="trend up">
              <ArrowUpRight size={13} /> {chartSeries[chartSeries.length - 1]?.v > 0 ? "Active" : "Stable"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={245}>
            <AreaChart data={chartSeries}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#4338CA" stopOpacity={0.28} />
                  <stop offset="1" stopColor="#4338CA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E7E5E4" />
              <XAxis dataKey="m" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#4338CA"
                strokeWidth={2.5}
                fill="url(#grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="surface chart-card">
          <div className="section-title">
            <div>
              <h2>Department cost</h2>
              <p>Current payroll distribution (Lakhs)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={245}>
            <BarChart data={departmentCost}>
              <CartesianGrid vertical={false} stroke="#E7E5E4" />
              <XAxis dataKey="d" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="v" fill="#818CF8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="surface chart-card">
          <div className="section-title">
            <div>
              <h2>Headcount distribution</h2>
              <p>Active employees by department</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={245}>
            <PieChart>
              <Pie
                data={headcountByDept}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
              >
                {headcountByDept.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="surface health-table">
        <div className="section-title">
          <div>
            <h2>Payroll health</h2>
            <p>Inputs that affect the current period.</p>
          </div>
          <StatusPill status="3 to review" />
        </div>
        <div>
          <span>
            Attendance complete <i style={{ width: `${health.attendanceComplete}%` }} />
          </span>
          <b>{health.attendanceComplete}%</b>
        </div>
        <div>
          <span>
            Contract coverage <i style={{ width: `${health.contractCoverage}%` }} />
          </span>
          <b>{health.contractCoverage}%</b>
        </div>
        <div>
          <span>
            Bank account verification{" "}
            <i className="amber" style={{ width: `${health.bankVerification}%` }} />
          </span>
          <b>{health.bankVerification}%</b>
        </div>
      </section>
    </>
  );
}
