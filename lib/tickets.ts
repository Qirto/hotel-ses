import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { departmentLabel } from "@/lib/format";

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
  { value: "ALL", label: "All time" },
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "7 days" },
  { value: "MONTH", label: "30 days" },
  { value: "ARCHIVE", label: "Older" },
] as const satisfies readonly { value: DateRange; label: string }[];

export const TICKET_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

export type TicketStatusFilter = (typeof TICKET_STATUS_OPTIONS)[number]["value"];

const DAY_MS = 864e5;

/** Date-range filter for ticket lists. Tickets without a creation date always match. */
export function inDateRange(ticket: Pick<Reclamation, "created_at">, range: DateRange, now: number): boolean {
  if (range === "ALL" || !ticket.created_at) return true;
  const days = (now - new Date(ticket.created_at).getTime()) / DAY_MS;
  // Written as exclusions so an unparseable date (NaN) still matches.
  if (range === "TODAY") return !(days > 1);
  if (range === "WEEK") return !(days > 7);
  if (range === "MONTH") return !(days > 30);
  return !(days <= 30);
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
