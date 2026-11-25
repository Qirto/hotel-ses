import type { HotelRoom, Reclamation } from "@/utils/roomsData";

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
