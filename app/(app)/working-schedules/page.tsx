"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Trash2, Pencil } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Modal } from "@/components/ui/modal";
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

const DEFAULT_SLOTS: SlotItem[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
];

export default function WorkingSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchSchedules = useCallback(() => {
    setLoading(true);
    fetch("/api/working-schedules")
      .then((res) => res.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setSchedules(d.data);
          // Keep the currently selected schedule if it still exists
          if (selectedSchedule) {
            const still = d.data.find((s: ScheduleItem) => s.id === selectedSchedule.id);
            if (still) {
              setSelectedSchedule(still);
              setSlots(still.slots || []);
              return;
            }
          }
          const active = d.data.find((s: ScheduleItem) => s.isDefault) || d.data[0];
          setSelectedSchedule(active);
          setSlots(active.slots || []);
        } else {
          setSchedules([]);
          setSelectedSchedule(null);
          setSlots([]);
        }
      })
      .catch((err) => console.error("Failed to load schedules:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const selectSchedule = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setSlots(schedule.slots || []);
    setSaveSuccess(false);
  };

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
      fetchSchedules();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, scheduleName: string) => {
    if (!confirm(`Are you sure you want to delete "${scheduleName}"?`)) return;
    try {
      const res = await fetch(`/api/working-schedules/${scheduleId}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedSchedule?.id === scheduleId) {
          setSelectedSchedule(null);
          setSlots([]);
        }
        fetchSchedules();
      } else {
        const data = await res.json();
        alert(data.error?.message || "Failed to delete schedule");
      }
    } catch {
      alert("An error occurred");
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
        <button className="primary" onClick={() => setShowModal(true)}>
          <Plus size={17} /> New schedule
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#78716C" }}>
          No working schedules found. Click "New schedule" to create one.
        </div>
      ) : (
        <div style={{ display: "flex", gap: "20px" }}>
          {/* Schedule list sidebar */}
          <div style={{ minWidth: "240px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {schedules.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSchedule(s)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: selectedSchedule?.id === s.id ? "#EEF2FF" : "#FAFAF9",
                  border: selectedSchedule?.id === s.id ? "2px solid #6366F1" : "1px solid #E7E5E4",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <b style={{ fontSize: "14px", color: "#1C1917" }}>{s.name}</b>
                  <div style={{ fontSize: "12px", color: "#78716C", marginTop: "2px" }}>
                    {s.timezone} · {formatHoursAndMinutes(s.totalWeeklyHours)}h/wk
                  </div>
                  {s.isDefault && (
                    <span style={{
                      display: "inline-block",
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#16A34A",
                      background: "#F0FDF4",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Delete schedule"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleDeleteSchedule(s.id, s.name);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Schedule detail */}
          {selectedSchedule && (
            <section className="surface schedule" style={{ flex: 1 }}>
              <div className="section-title">
                <div>
                  <h2>{selectedSchedule.name}</h2>
                  <p>
                    {selectedSchedule.timezone} · {selectedSchedule.isDefault ? "Default Schedule" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <StatusPill status={selectedSchedule.status} />
                  <button
                    className="secondary"
                    style={{ padding: "4px 8px", display: "flex", alignItems: "center" }}
                    onClick={() => setShowEditModal(true)}
                    title="Edit schedule details"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
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
        </div>
      )}

      <NewScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchSchedules}
      />

      {selectedSchedule && (
        <EditScheduleModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchSchedules}
          schedule={selectedSchedule}
        />
      )}
    </>
  );
}

/* ─── New Schedule Modal ─── */
function NewScheduleModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [isDefault, setIsDefault] = useState(false);
  const [newSlots, setNewSlots] = useState<SlotItem[]>(DEFAULT_SLOTS.map((s) => ({ ...s })));

  const handleSlotChange = (index: number, field: keyof SlotItem, value: any) => {
    const updated = [...newSlots];
    updated[index] = { ...updated[index], [field]: value };
    setNewSlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name,
        timezone,
        isDefault,
        slots: newSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: Number(s.breakMinutes),
        })),
      };

      const res = await fetch("/api/working-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create schedule");
      }

      // Reset
      setName("");
      setTimezone("Asia/Kolkata");
      setIsDefault(false);
      setNewSlots(DEFAULT_SLOTS.map((s) => ({ ...s })));

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMinutes = newSlots.reduce(
    (acc, s) => acc + calculateSlotMinutes(s.startTime, s.endTime, Number(s.breakMinutes)),
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Working Schedule" width="640px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="form-grid">
          <label>
            Schedule name *
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Night Shift (Mon–Sat)"
            />
          </label>
          <label>
            Timezone
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            style={{ width: "16px", height: "16px" }}
          />
          Set as default schedule
        </label>

        <div style={{ borderTop: "1px solid #E7E5E4", paddingTop: "12px" }}>
          <b style={{ fontSize: "13px", color: "#1C1917" }}>Weekly Slots</b>
        </div>

        <table style={{ fontSize: "13px" }}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Start</th>
              <th>End</th>
              <th>Break</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {newSlots.map((slot, index) => {
              const mins = calculateSlotMinutes(slot.startTime, slot.endTime, Number(slot.breakMinutes));
              return (
                <tr key={index}>
                  <td><b>{DAY_NAMES[slot.dayOfWeek]}</b></td>
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
                      <option value={60}>1h</option>
                      <option value={90}>1h 30m</option>
                    </select>
                  </td>
                  <td><b>{formatHoursAndMinutes(mins / 60)}</b></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total weekly</td>
              <td><b>{formatHoursAndMinutes(totalMinutes / 60)}</b></td>
            </tr>
          </tfoot>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Edit Schedule Modal ─── */
function EditScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  schedule,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: ScheduleItem;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(schedule.name);
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [isDefault, setIsDefault] = useState(schedule.isDefault);

  useEffect(() => {
    setName(schedule.name);
    setTimezone(schedule.timezone);
    setIsDefault(schedule.isDefault);
  }, [schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/working-schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, isDefault }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update schedule");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Working Schedule" width="500px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <label>
          Schedule name *
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        
        <label>
          Timezone
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            style={{ width: "16px", height: "16px" }}
          />
          Set as default schedule
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
