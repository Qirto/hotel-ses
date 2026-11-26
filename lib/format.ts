import { formatDate, formatTime, hotelDayNumber } from "@/lib/datetime";

// Date primitives live in lib/datetime; re-exported for existing imports.
export { DAY_MS, pad2 } from "@/lib/datetime";

export interface IncidentDate {
  /** e.g. "12/10/2026" (dd/MM/yyyy, hotel time) */
  formatted: string;
  /** e.g. "20:42" (hotel time) */
  time: string;
  /** e.g. "Today", "Yesterday", "3d ago", "2mo ago", "Scheduled" */
  relative: string;
  /** e.g. "12/10/2026 • 20:42" */
  full: string;
}

const RECENT: IncidentDate = { formatted: "Recent", time: "", relative: "Just now", full: "Recent" };

/** Formats a reclamation timestamp for lists, cards and timelines. */
export function formatIncidentDate(dateStr?: string | null): IncidentDate {
  if (!dateStr) return RECENT;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return RECENT;

  // calendar days in hotel time, so "Today" flips at the hotel's midnight
  const diffDays = hotelDayNumber(Date.now()) - hotelDayNumber(d);
  let relative = "Today";
  if (diffDays < 0) relative = "Scheduled";
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`;
  else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
  else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`;

  const formatted = formatDate(d);
  const time = formatTime(d);

  return { formatted, time, relative, full: `${formatted} • ${time}` };
}

/** "1 ticket", "3 tickets"; pass `pluralForm` for irregular nouns. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  TECHNICAL: "Technical",
  MAINTENANCE: "Maintenance",
  HOUSEKEEPING: "Housekeeping",
  GOVERNANCE: "Housekeeping",
  FOOD_AND_BEVERAGE: "Food & Beverage",
  CONCIERGE: "Concierge",
  SECURITY: "Security",
  RECEPTION: "Reception",
  MANAGEMENT: "Management",
  SPA_AND_WELLNESS: "Spa & Wellness",
  SALES_AND_MARKETING: "Sales & Marketing",
  FINANCE_AND_ACCOUNTING: "Finance",
  HUMAN_RESOURCES: "Human Resources",
};

/** "FOOD_AND_BEVERAGE" -> "Food & Beverage"; unknown codes are title-cased. */
export function departmentLabel(code?: string | null): string {
  if (!code) return "Unassigned";
  return (
    DEPARTMENT_LABELS[code.toUpperCase()] ??
    code
      .toLowerCase()
      .split("_")
      .map((w) => (w === "and" ? "&" : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ")
  );
}

/** "42%" of a whole; "<1%" for a non-zero sliver (never a misleading "0%"); "–" with no whole. */
export function percent(part: number, total: number): string {
  if (!total) return "–";
  const pct = (part / total) * 100;
  if (part > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/** Durations shown to staff: "45 min"; "–" when unknown. */
export function formatMinutes(minutes: number | null | undefined): string {
  return minutes == null || !Number.isFinite(minutes) ? "–" : `${Math.round(minutes)} min`;
}
