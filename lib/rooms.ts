import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { isOpenTicket } from "@/lib/tickets";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "special";

export interface RoomTicketStats {
  total: number;
  open: number;
  /** Highest open priority, if any */
  urgent: boolean;
}

/** One pass over the tickets: stats per room id (O(tickets), not O(rooms x tickets)). */
export function ticketStatsByRoom(tickets: readonly Reclamation[]): Map<number, RoomTicketStats> {
  const map = new Map<number, RoomTicketStats>();
  for (const t of tickets) {
    let s = map.get(t.room_id);
    if (!s) map.set(t.room_id, (s = { total: 0, open: 0, urgent: false }));
    s.total++;
    if (isOpenTicket(t)) {
      s.open++;
      if (t.priority === "EMERGENCY" || t.priority === "HIGH") s.urgent = true;
    }
  }
  return map;
}

export const CLEANING_LABEL: Record<HotelRoom["cleaning_status"], string> = {
  CLEAN: "Clean",
  DIRTY: "Dirty",
  CLEANING: "Cleaning",
  INSPECTING: "Inspecting",
};

export const CLEANING_TONE: Record<HotelRoom["cleaning_status"], Tone> = {
  CLEAN: "success",
  DIRTY: "danger",
  CLEANING: "warning",
  INSPECTING: "info",
};

/** The one status a room tile shows first: what needs action wins. */
export function roomHeadline(room: HotelRoom, stats?: RoomTicketStats): { label: string; tone: Tone } {
  if (stats?.urgent) return { label: "Urgent issue", tone: "danger" };
  if (stats && stats.open > 0) return { label: stats.open === 1 ? "1 open issue" : `${stats.open} open issues`, tone: "warning" };
  if (room.cleaning_status !== "CLEAN") return { label: CLEANING_LABEL[room.cleaning_status], tone: CLEANING_TONE[room.cleaning_status] };
  return { label: room.is_occupied ? "Occupied" : "Ready", tone: room.is_occupied ? "info" : "success" };
}

export function blockLabel(block?: string | null): string {
  return block ? block.replace("BLOCK_", "Block ") : "Main";
}
