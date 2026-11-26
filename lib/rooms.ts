import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { isOpenTicket } from "@/lib/tickets";
import { plural } from "@/lib/format";

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
  CLEAN: "Propre",
  DIRTY: "À nettoyer",
  CLEANING: "En nettoyage",
  INSPECTING: "En contrôle",
};

export const CLEANING_TONE: Record<HotelRoom["cleaning_status"], Tone> = {
  CLEAN: "success",
  DIRTY: "danger",
  CLEANING: "warning",
  INSPECTING: "info",
};

/** The one status a room tile shows first: what needs action wins. */
export function roomHeadline(room: HotelRoom, stats?: RoomTicketStats): { label: string; tone: Tone } {
  if (stats?.urgent) return { label: "Urgence", tone: "danger" };
  if (stats && stats.open > 0) return { label: plural(stats.open, "problème ouvert", "problèmes ouverts"), tone: "warning" };
  if (room.cleaning_status !== "CLEAN") return { label: CLEANING_LABEL[room.cleaning_status], tone: CLEANING_TONE[room.cleaning_status] };
  return { label: room.is_occupied ? "Occupée" : "Prête", tone: room.is_occupied ? "info" : "success" };
}

export function blockLabel(block?: string | null): string {
  return block ? block.replace("BLOCK_", "Bloc ") : "Principal";
}

/** Housekeeping cycle: each step leads to the next. */
export const NEXT_CLEANING: Record<HotelRoom["cleaning_status"], HotelRoom["cleaning_status"]> = {
  DIRTY: "CLEANING",
  CLEANING: "INSPECTING",
  INSPECTING: "CLEAN",
  CLEAN: "DIRTY",
};

export interface RoomStatusCounts {
  occupied: number;
  vacant: number;
  /** Vacant and clean: ready to sell. */
  vacantClean: number;
  vacantDirty: number;
  /** Dirty, occupied or not. */
  dirty: number;
  /** Vacant and being cleaned or inspected. */
  inCleaning: number;
}

/** One pass over the rooms. occupied + vacantClean + vacantDirty + inCleaning is an exact partition. */
export function roomStatusCounts(rooms: readonly Pick<HotelRoom, "is_occupied" | "cleaning_status">[]): RoomStatusCounts {
  let occupied = 0;
  let vacant = 0;
  let vacantClean = 0;
  let vacantDirty = 0;
  let dirty = 0;
  for (const r of rooms) {
    if (r.is_occupied) occupied++;
    else {
      vacant++;
      if (r.cleaning_status === "CLEAN") vacantClean++;
      if (r.cleaning_status === "DIRTY") vacantDirty++;
    }
    if (r.cleaning_status === "DIRTY") dirty++;
  }
  return { occupied, vacant, vacantClean, vacantDirty, dirty, inCleaning: vacant - vacantClean - vacantDirty };
}

/** Room status filters shared by every Rooms view (and the dashboard deep links). */
export type RoomFilter = "ALL" | "ATTENTION" | "OCCUPIED" | "VACANT" | "VACANT_CLEAN" | "DIRTY";

export function matchesRoomFilter(room: HotelRoom, filter: RoomFilter, stats?: RoomTicketStats): boolean {
  switch (filter) {
    case "ATTENTION":
      return room.cleaning_status === "DIRTY" || (stats?.open ?? 0) > 0;
    case "OCCUPIED":
      return Boolean(room.is_occupied);
    case "VACANT":
      return !room.is_occupied;
    case "VACANT_CLEAN":
      return !room.is_occupied && room.cleaning_status === "CLEAN";
    case "DIRTY":
      return room.cleaning_status === "DIRTY";
    default:
      return true;
  }
}

/** Stay states the front desk can set (check in / check out). */
export type StayState = "OCCUPIED" | "VACANT_DIRTY";

/** Optimistic room patch after a successful stay change. */
export const STAY_RESULT: Record<StayState, Partial<HotelRoom>> = {
  OCCUPIED: { is_occupied: true },
  VACANT_DIRTY: { is_occupied: false, cleaning_status: "DIRTY" },
};

export const STAY_MESSAGE: Record<StayState, string> = {
  OCCUPIED: "arrivée enregistrée",
  VACANT_DIRTY: "départ enregistré, chambre à nettoyer",
};

/** Floor filter options: "All floors" plus every floor present, ascending. */
export function floorOptions(rooms: readonly Pick<HotelRoom, "floor">[]): { value: "ALL" | number; label: string }[] {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  return [{ value: "ALL", label: "Tous les étages" }, ...floors.map((f) => ({ value: f, label: `Étage ${f}` }))];
}

/** Block filter options from the rooms present (« Tous les blocs », « Bloc A », …). */
export function blockOptions(rooms: readonly Pick<HotelRoom, "block">[]): { value: string; label: string }[] {
  const blocks = [...new Set(rooms.map((r) => r.block).filter(Boolean))].sort();
  return [{ value: "ALL", label: "Tous les blocs" }, ...blocks.map((b) => ({ value: b, label: blockLabel(b) }))];
}

export type RoomSide = { side: "even" | "odd"; label: string; from: string; to: string; rooms: HotelRoom[] };
export type RoomBlock = { block: string; label: string; rooms: HotelRoom[]; sides: RoomSide[] };
export type RoomFloor = { floor: number; rooms: HotelRoom[]; blocks: RoomBlock[] };

/** Corridor sides: even numbers on the left, odd on the right (hotel floor plan). */
const SIDES = [
  { side: "even", label: "Côté gauche · pairs" },
  { side: "odd", label: "Côté droit · impairs" },
] as const;

/**
 * Rooms as they are built: floor → block → corridor side, each in number order.
 * Works for any numbering (gaps, exceptions): it reads floor, block and the number.
 */
export function roomLayout(rooms: readonly HotelRoom[]): RoomFloor[] {
  const byNumber = (a: HotelRoom, b: HotelRoom) => Number(a.room_number) - Number(b.room_number);
  const floors = new Map<number, Map<string, HotelRoom[]>>();
  for (const r of rooms) {
    const blocks = floors.get(r.floor) ?? new Map<string, HotelRoom[]>();
    const list = blocks.get(r.block) ?? [];
    list.push(r);
    blocks.set(r.block, list);
    floors.set(r.floor, blocks);
  }
  return [...floors.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([floor, blocks]) => {
      const blockList = [...blocks.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([block, list]) => {
          const sorted = [...list].sort(byNumber);
          const sides = SIDES.map(({ side, label }) => {
            const sideRooms = sorted.filter((r) => (Number(r.room_number) % 2 === 0) === (side === "even"));
            return { side, label, from: sideRooms[0]?.room_number ?? "", to: sideRooms.at(-1)?.room_number ?? "", rooms: sideRooms };
          }).filter((s) => s.rooms.length > 0);
          return { block, label: blockLabel(block), rooms: sorted, sides };
        });
      return { floor, rooms: blockList.flatMap((b) => b.rooms), blocks: blockList };
    });
}

/** "Étage 1 · Bloc A". */
export const roomLocation = (room: Pick<HotelRoom, "floor" | "block">) => `Étage ${room.floor} · ${blockLabel(room.block)}`;

/** Whether a ticket belongs to a room (by id, or by room number for joined rows without an id). */
export const isTicketForRoom = (t: Pick<Reclamation, "room_id"> & { room?: { room_number?: string | null } | null }, room: Pick<HotelRoom, "id" | "room_number">) =>
  t.room_id === room.id || t.room?.room_number === room.room_number;
