export interface SlotInput {
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  breakMinutes: number;
}

/**
 * Calculate worked minutes for a single time slot.
 */
export function calculateSlotMinutes(startTime: string, endTime: string, breakMinutes = 0): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const total = endMinutes - startMinutes - breakMinutes;
  return Math.max(0, total);
}

/**
 * Calculate total weekly hours for an array of slots.
 */
export function calculateWeeklyHours(slots: SlotInput[]): number {
  const totalMinutes = slots.reduce((acc, slot) => {
    return acc + calculateSlotMinutes(slot.startTime, slot.endTime, slot.breakMinutes);
  }, 0);

  return Number((totalMinutes / 60).toFixed(2));
}

/**
 * Format hours into "Xh Ym" string
 */
export function formatHoursAndMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
