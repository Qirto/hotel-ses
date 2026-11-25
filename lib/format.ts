export interface IncidentDate {
  /** e.g. "Oct 12, 2026" */
  formatted: string;
  /** e.g. "08:42 PM" */
  time: string;
  /** e.g. "Today", "Yesterday", "3d ago", "2mo ago", "Scheduled" */
  relative: string;
  /** e.g. "Oct 12, 2026 • 08:42 PM" */
  full: string;
}

const RECENT: IncidentDate = { formatted: "Recent", time: "", relative: "Just now", full: "Recent" };
const DAY_MS = 1000 * 60 * 60 * 24;

/** Formats a reclamation timestamp for lists, cards and timelines. */
export function formatIncidentDate(dateStr?: string | null): IncidentDate {
  if (!dateStr) return RECENT;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return RECENT;

  const diffDays = Math.floor((Date.now() - d.getTime()) / DAY_MS);
  let relative = "Today";
  if (diffDays < 0) relative = "Scheduled";
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`;
  else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
  else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`;

  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return { formatted, time, relative, full: `${formatted} • ${time}` };
}

/** "1 ticket", "3 tickets"; pass `pluralForm` for irregular nouns. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
