"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatHoursAndMinutes, calculateSlotMinutes } from "@/lib/utils/schedule";

interface SlotItem {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

interface ScheduleItem {
  id: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  status: string;
  totalWeeklyHours: number;
  slots: SlotItem[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkingSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSchedules = useCallback(() => {
    setLoading(true);
    fetch("/api/working-schedules")
      .then((res) => res.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setSchedules(d.data);
          const active = d.data.find((s: ScheduleItem) => s.isDefault) || d.data[0];
          setSelectedSchedule(active);
          setSlots(active.slots || []);
        }
      })
      .catch((err) => console.error("Failed to load schedules:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSlotChange = (index: number, field: keyof SlotItem, value: any) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const handleSaveSlots = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/working-schedules/${selectedSchedule.id}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: Number(s.breakMinutes),
          }))
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save slots");
      }

      setSelectedSchedule(data.data);
      setSlots(data.data.slots);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Compute live preview of weekly hours from local state
  const liveWeeklyMinutes = slots.reduce((acc, slot) => {
    return acc + calculateSlotMinutes(slot.startTime, slot.endTime, Number(slot.breakMinutes));
  }, 0);
  const liveWeeklyHours = liveWeeklyMinutes / 60;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">People &gt; Working schedules</div>
          <h1>Working schedules</h1>
          <p>Defined hours that flow into attendance calculations.</p>
        </div>
        <button className="primary" onClick={() => alert("New schedule creation")}>
          <Plus size={17} /> New schedule
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          Loading schedules...
        </div>
      ) : !selectedSchedule ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          No working schedules found.
        </div>
      ) : (
        <section className="surface schedule">
          <div className="section-title">
            <div>
              <h2>{selectedSchedule.name}</h2>
              <p>
                {selectedSchedule.timezone} · {selectedSchedule.isDefault ? "Default Schedule" : ""}
              </p>
            </div>
            <StatusPill status={selectedSchedule.status} />
          </div>

          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Start time</th>
                <th>End time</th>
                <th>Break</th>
                <th>Computed hours</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => {
                const slotMinutes = calculateSlotMinutes(slot.startTime, slot.endTime, Number(slot.breakMinutes));
                const slotHours = slotMinutes / 60;

                return (
                  <tr key={slot.id || index}>
                    <td>
                      <b>{DAY_NAMES[slot.dayOfWeek]}</b>
                    </td>
                    <td>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, "startTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(index, "endTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={slot.breakMinutes}
                        onChange={(e) => handleSlotChange(index, "breakMinutes", Number(e.target.value))}
                      >
                        <option value={0}>0m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>1h 00m</option>
                        <option value={90}>1h 30m</option>
                      </select>
                    </td>
                    <td>
                      <b>{formatHoursAndMinutes(slotHours)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  Total weekly hours <small>(auto-calculated from slots)</small>
                </td>
                <td>
                  <b>{formatHoursAndMinutes(liveWeeklyHours)}</b>
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", borderTop: "1px solid #E7E5E4" }}>
            {saveSuccess && (
              <span style={{ color: "#16A34A", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Check size={16} /> Saved successfully!
              </span>
            )}
            <button className="primary" onClick={handleSaveSlots} disabled={saving}>
              {saving ? "Saving..." : "Save Schedule Hours"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
