/**
 * Status-to-variant mapping for the StatusPill component.
 * Replaces the reference prototype's ad-hoc .includes() pattern
 * with a proper declarative mapping.
 *
 * @see PayCore_Build_Prompt.md Section 15A (StatusPill refactor note)
 */

export type PillVariant = "success" | "warning" | "danger" | "neutral";

/**
 * Map a status string to a pill CSS variant.
 * Case-insensitive matching for flexibility.
 */
const STATUS_VARIANT_MAP: Record<string, PillVariant> = {
  // Success variants (green)
  active: "success",
  approved: "success",
  running: "success",
  paid: "success",
  present: "success",
  completed: "success",
  verified: "success",

  // Warning variants (amber)
  "to approve": "warning",
  "to_approve": "warning",
  pending: "warning",
  pending_approval: "warning",
  draft: "warning",
  processing: "warning",
  computed: "warning",
  late: "warning",
  "missing checkout": "warning",
  missing_checkout: "warning",

  // Danger variants (red)
  rejected: "warning",
  refused: "warning",
  inactive: "danger",
  cancelled: "danger",
  terminated: "danger",
  blocker: "danger",
  absent: "danger",
  expired: "danger",
  negative_net_pay: "danger",

  // Neutral variants (gray)
  validated: "neutral",
  "on leave": "neutral",
  on_leave: "neutral",
  archived: "neutral",
};

/**
 * Get the pill variant for a given status string.
 * Falls back to "neutral" for unknown statuses.
 */
export function getStatusVariant(status: string): PillVariant {
  const normalized = status.toLowerCase().trim();
  return STATUS_VARIANT_MAP[normalized] || "neutral";
}

/**
 * Get the human-readable display text for a status string.
 * Converts UPPER_CASE enum values to Title Case.
 */
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
