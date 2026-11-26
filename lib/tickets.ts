import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { categoryLabel, departmentLabel } from "@/lib/format";
import { hotelDayNumber } from "@/lib/datetime";
import type { Tone } from "@/lib/rooms";

/** A ticket is open until it is resolved (OPEN, ACKNOWLEDGED or IN_PROGRESS). */
export function isOpenTicket(ticket: Pick<Reclamation, "status">): boolean {
  return ticket.status !== "RESOLVED";
}

export function countOpenTickets(tickets: readonly Pick<Reclamation, "status">[]): number {
  return tickets.filter(isOpenTicket).length;
}

/** Rooms that need someone: dirty, or with at least one open ticket. */
export function countRoomsNeedingAttention(
  rooms: readonly Pick<HotelRoom, "id" | "cleaning_status">[],
  tickets: readonly Pick<Reclamation, "room_id" | "status">[]
): number {
  const withOpenTicket = new Set(tickets.filter(isOpenTicket).map((t) => t.room_id));
  return rooms.filter((r) => r.cleaning_status === "DIRTY" || withOpenTicket.has(r.id)).length;
}

/** Open and emergency or high priority. */
export function isUrgentOpenTicket(ticket: Pick<Reclamation, "status" | "priority">): boolean {
  return isOpenTicket(ticket) && (ticket.priority === "EMERGENCY" || ticket.priority === "HIGH");
}

export type DateRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE";

export const DATE_RANGES = [
  { value: "ALL", label: "Toute la période" },
  { value: "TODAY", label: "Aujourd’hui" },
  { value: "WEEK", label: "7 jours" },
  { value: "MONTH", label: "30 jours" },
  { value: "ARCHIVE", label: "Plus ancien" },
] as const satisfies readonly { value: DateRange; label: string }[];

/** Ticket status: label, badge tone and sort order (open first). The one definition. */
export const TICKET_STATUS: Record<Reclamation["status"], { label: string; tone: Tone; order: number }> = {
  OPEN: { label: "Ouverte", tone: "danger", order: 0 },
  ACKNOWLEDGED: { label: "Prise en charge", tone: "warning", order: 1 },
  IN_PROGRESS: { label: "En cours", tone: "warning", order: 2 },
  RESOLVED: { label: "Résolue", tone: "success", order: 3 },
};

/** Ticket priority: label, tone and sort order (most urgent first). */
export const TICKET_PRIORITY: Record<Reclamation["priority"], { label: string; tone: Tone; order: number }> = {
  EMERGENCY: { label: "Urgente", tone: "danger", order: 0 },
  HIGH: { label: "Haute", tone: "warning", order: 1 },
  STANDARD: { label: "Normale", tone: "neutral", order: 2 },
};

export type TicketStatusFilter = "ALL" | Reclamation["status"];

export const TICKET_STATUS_OPTIONS: { value: TicketStatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  ...(Object.keys(TICKET_STATUS) as Reclamation["status"][]).map((s) => ({ value: s, label: TICKET_STATUS[s].label })),
];


/** Free-text ticket search: room number, issue (code and label), department label, description and assignee. */
export function matchesTicketQuery(
  ticket: Pick<Reclamation, "category" | "description"> & Partial<Pick<Reclamation, "department">> & { room?: { room_number?: string | null } | null; assigned_to?: { full_name?: string | null } | null },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    ticket.room?.room_number,
    ticket.category,
    categoryLabel(ticket.category),
    ticket.department ? departmentLabel(ticket.department) : undefined,
    ticket.description,
    ticket.assigned_to?.full_name,
  ].some((v) => v?.toLowerCase().includes(q));
}

/** Date-range filter for ticket lists. Tickets without a creation date always match. */
export function inDateRange(ticket: Pick<Reclamation, "created_at">, range: DateRange, now: number): boolean {
  if (range === "ALL" || !ticket.created_at) return true;
  const created = new Date(ticket.created_at);
  if (Number.isNaN(created.getTime())) return true; // unparseable dates always match
  // hotel calendar days: "Today" is the hotel's today, not the last 24 hours
  const days = hotelDayNumber(now) - hotelDayNumber(created);
  if (range === "TODAY") return days <= 0;
  if (range === "WEEK") return days < 7;
  if (range === "MONTH") return days < 30;
  return days >= 30;
}

/** Open and resolved counts per department, busiest first. */
export function ticketsByDepartment(
  tickets: readonly Pick<Reclamation, "department" | "status">[],
  limit = 6
): { label: string; open: number; resolved: number }[] {
  const counts = new Map<string, { open: number; resolved: number }>();
  for (const t of tickets) {
    const c = counts.get(t.department) ?? { open: 0, resolved: 0 };
    if (isOpenTicket(t)) c.open++;
    else c.resolved++;
    counts.set(t.department, c);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].open + b[1].resolved - (a[1].open + a[1].resolved))
    .slice(0, limit)
    .map(([dept, c]) => ({ label: departmentLabel(dept), open: c.open, resolved: c.resolved }));
}

/** Time from creation to resolution, in ms; null when unknown or inconsistent. */
export function resolutionMs(ticket: Pick<Reclamation, "status" | "created_at" | "resolved_at">): number | null {
  if (ticket.status !== "RESOLVED" || !ticket.created_at || !ticket.resolved_at) return null;
  const ms = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** Average time to fix over resolved tickets, in whole minutes; null when none qualify. */
export function averageResolutionMinutes(tickets: readonly Pick<Reclamation, "status" | "created_at" | "resolved_at">[]): number | null {
  let total = 0;
  let n = 0;
  for (const t of tickets) {
    const ms = resolutionMs(t);
    if (ms != null) {
      total += ms;
      n++;
    }
  }
  return n ? Math.round(total / n / 60000) : null;
}
