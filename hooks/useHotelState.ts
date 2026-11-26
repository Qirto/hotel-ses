"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { countOpenTickets, countRoomsNeedingAttention } from "@/lib/tickets";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import type { RoomLogMode } from "@/components/features/room/RoomLogForms";
import { useActions, useSyncedState, type Actions } from "./useActions";

export interface HotelState extends Actions {
  tickets: Reclamation[];
  setTickets: Dispatch<SetStateAction<Reclamation[]>>;

  /** `rooms` with optimistic patches applied; patches reset when `rooms` changes. */
  liveRooms: HotelRoom[];
  patchRoom: (id: number, patch: Partial<HotelRoom>) => void;

  /** The room a detail view is about (from the URL), with its optimistic patches. */
  selectedRoom: HotelRoom | null;
  /** New request or past incident, in the room detail. */
  logMode: RoomLogMode;
  setLogMode: (mode: RoomLogMode) => void;

  openCount: number;
  attentionCount: number;
}

/**
 * Rooms and requests of a screen, with optimistic edits on top of the server data,
 * plus the action runner. A new server render (navigation, revalidation, realtime)
 * replaces the local copies.
 */
export function useHotelState({
  rooms,
  reclamations,
  selectedRoomId = null,
}: {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  selectedRoomId?: number | null;
}): HotelState {
  const actions = useActions();
  const [tickets, setTickets] = useSyncedState<Reclamation[]>(reclamations);

  // Optimistic room patches, dropped when new server data arrives.
  const [roomOverrides, setRoomOverrides] = useSyncedState<Record<number, Partial<HotelRoom>>>(useMemo(() => ({}), [rooms]));
  const liveRooms = useMemo(
    () => (Object.keys(roomOverrides).length ? rooms.map((r) => (roomOverrides[r.id] ? { ...r, ...roomOverrides[r.id] } : r)) : rooms),
    [rooms, roomOverrides]
  );
  const patchRoom = useCallback(
    (id: number, patch: Partial<HotelRoom>) => setRoomOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    []
  );

  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const [logMode, setLogMode] = useState<RoomLogMode>("NEW");

  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);

  return { ...actions, tickets, setTickets, liveRooms, patchRoom, selectedRoom, logMode, setLogMode, openCount, attentionCount };
}
