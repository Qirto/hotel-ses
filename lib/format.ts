import { formatDate, formatTime, hotelDayNumber } from "@/lib/datetime";

// Date primitives live in lib/datetime; re-exported for existing imports.
export { DAY_MS, pad2 } from "@/lib/datetime";

const CATEGORY_LABELS: Record<string, string> = {
  "A/C": "Climatisation",
  Plumbing: "Plomberie",
  Electrical: "Électricité",
  "TV/Audio": "TV / audio",
  Lock: "Serrure",
  Towels: "Serviettes",
  Bedding: "Literie",
  Toiletries: "Produits d’accueil",
  Cleaning: "Nettoyage",
  Minibar: "Minibar",
  "Room Service": "Room service",
  Breakfast: "Petit-déjeuner",
  Drinks: "Bar",
  "Food Quality": "Qualité des plats",
  Billing: "Facturation",
  Luggage: "Bagages",
  Transport: "Transport",
  Keycard: "Carte-clé",
  General: "Demande générale",
  Urgent: "Urgence",
};

/** Display label for a stored category code ("A/C" -> "Climatisation"); unknown codes are returned as-is. */
export function categoryLabel(category?: string | null): string {
  if (!category) return "";
  return CATEGORY_LABELS[category] ?? category;
}

export interface IncidentDate {
  /** e.g. "12/10/2026" (dd/MM/yyyy, hotel time) */
  formatted: string;
  /** e.g. "20:42" (hotel time) */
  time: string;
  /** e.g. "Aujourd’hui", "Hier", "il y a 3 j", "il y a 2 mois", "il y a 1 an", "Planifiée" */
  relative: string;
  /** e.g. "12/10/2026 • 20:42" */
  full: string;
}

const RECENT: IncidentDate = { formatted: "Récent", time: "", relative: "À l’instant", full: "Récent" };

/** Formats a reclamation timestamp for lists, cards and timelines. */
export function formatIncidentDate(dateStr?: string | null): IncidentDate {
  if (!dateStr) return RECENT;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return RECENT;

  // calendar days in hotel time, so "Today" flips at the hotel's midnight
  const diffDays = hotelDayNumber(Date.now()) - hotelDayNumber(d);
  let relative = "Aujourd’hui";
  if (diffDays < 0) relative = "Planifiée";
  else if (diffDays === 1) relative = "Hier";
  else if (diffDays > 1 && diffDays < 30) relative = `il y a ${diffDays} j`;
  else if (diffDays >= 30 && diffDays < 365) relative = `il y a ${Math.floor(diffDays / 30)} mois`;
  else if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    relative = `il y a ${plural(years, "an")}`;
  }

  const formatted = formatDate(d);
  const time = formatTime(d);

  return { formatted, time, relative, full: `${formatted} • ${time}` };
}

/**
 * "1 demande", "3 demandes"; French rule: 0 and 1 are singular.
 * Pass `pluralForm` for irregular nouns.
 */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${Math.abs(count) < 2 ? singular : pluralForm}`;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  TECHNICAL: "Service technique",
  MAINTENANCE: "Service technique",
  HOUSEKEEPING: "Gouvernance",
  GOVERNANCE: "Gouvernance",
  FOOD_AND_BEVERAGE: "Restauration",
  CONCIERGE: "Conciergerie",
  SECURITY: "Sécurité",
  RECEPTION: "Réception",
  MANAGEMENT: "Direction",
  SPA_AND_WELLNESS: "Spa & thalasso",
  SALES_AND_MARKETING: "Commercial & marketing",
  FINANCE_AND_ACCOUNTING: "Finance & comptabilité",
  HUMAN_RESOURCES: "Ressources humaines",
};

/** "FOOD_AND_BEVERAGE" -> "Restauration"; unknown codes are title-cased. */
export function departmentLabel(code?: string | null): string {
  if (!code) return "Non assignée";
  return (
    DEPARTMENT_LABELS[code.toUpperCase()] ??
    code
      .toLowerCase()
      .split("_")
      .map((w) => (w === "and" ? "&" : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ")
  );
}

/** "42 %" of a whole; "<1 %" for a non-zero sliver (never a misleading "0 %"); "–" with no whole. */
export function percent(part: number, total: number): string {
  if (!total) return "–";
  const pct = (part / total) * 100;
  if (part > 0 && pct < 1) return "<1 %";
  return `${Math.round(pct)} %`;
}

/** Durations shown to staff: "45 min"; "–" when unknown. */
export function formatMinutes(minutes: number | null | undefined): string {
  return minutes == null || !Number.isFinite(minutes) ? "–" : `${Math.round(minutes)} min`;
}
