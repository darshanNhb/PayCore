"use client";

interface AttendanceTabProps {
  employee: any;
}

export function AttendanceTab({ employee }: AttendanceTabProps) {
  // Generate days 1..30 with realistic patterns for the current month
  const days = Array.from({ length: 30 }, (_, i) => {
    const dayOfWeek = (i + 1) % 7;
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
    const isLate = i === 7 || i === 14;
    return {
      day: i + 1,
      type: isWeekend ? "weekend" : isLate ? "late" : "present",
      icon: isWeekend ? "—" : isLate ? "⚠" : "✓",
    };
  });

  return (
    <section className="surface detail-card">
      <h2>Attendance · September 2026</h2>
      <p className="sub">
        Showing attendance records linked from {employee.name}&apos;s employee profile.
      </p>

      <div className="month-grid mini" style={{ marginTop: "20px" }}>
        {days.map((d) => (
          <span key={d.day} className={d.type}>
            {d.day}
            <i>{d.icon}</i>
          </span>
        ))}
      </div>
    </section>
  );
}
