"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { useFlash, type Flash } from "@/components/app/notice";
import type { RoomLogMode } from "@/components/features/room/RoomLogForms";

/** Local copy of a prop: optimistic edits show instantly, a new prop value (server refresh) replaces them. */
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(value);
  useEffect(() => setState(value), [value]);
  return [state, setState];
}

export interface PortalState<Tab extends string> {
  activeTab: Tab;
  /** Switch tab inside a transition, so a heavy view never blocks the tap. */
  go: (tab: Tab) => void;

  tickets: Reclamation[];
  setTickets: Dispatch<SetStateAction<Reclamation[]>>;

  /** `rooms` with optimistic patches applied; patches reset when `rooms` changes. */
  liveRooms: HotelRoom[];
  patchRoom: (id: number, patch: Partial<HotelRoom>) => void;

  /** Server-action transition. */
  isPending: boolean;
  run: (action: () => Promise<void>) => void;
  /** `run`, resolving with the action's result (for forms that reset on success). */
  runForResult: <T>(action: () => Promise<T>) => Promise<T>;

  flash: Flash;

  /** Room detail sheet. */
  selectedRoom: HotelRoom | null;
  openRoom: (room: HotelRoom) => void;
  closeRoom: () => void;
  logMode: RoomLogMode;
  setLogMode: (mode: RoomLogMode) => void;
}

/**
 * The state plumbing every portal shares. Needs a `NoticeProvider` above the
 * calling component (for `flash`).
 */
export function usePortalState<Tab extends string>({
  initialTab,
  rooms,
  reclamations,
}: {
  initialTab: Tab;
  rooms: HotelRoom[];
  reclamations: Reclamation[];
}): PortalState<Tab> {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [, startTabTransition] = useTransition();
  const go = useCallback((tab: Tab) => startTabTransition(() => setActiveTab(tab)), []);

  const [tickets, setTickets] = useSyncedState<Reclamation[]>(reclamations);

  const [roomOverrides, setRoomOverrides] = useState<Record<number, Partial<HotelRoom>>>({});
  useEffect(() => setRoomOverrides({}), [rooms]);
  const liveRooms = useMemo(
    () => (Object.keys(roomOverrides).length ? rooms.map((r) => (roomOverrides[r.id] ? { ...r, ...roomOverrides[r.id] } : r)) : rooms),
    [rooms, roomOverrides]
  );
  const patchRoom = useCallback(
    (id: number, patch: Partial<HotelRoom>) => setRoomOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    []
  );

  const [isPending, run] = useTransition();
  const runForResult = useCallback(
    <T,>(action: () => Promise<T>) => new Promise<T>((resolve) => run(async () => resolve(await action()))),
    [run]
  );

  const flash = useFlash();

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const openRoom = useCallback((room: HotelRoom) => setSelectedRoomId(room.id), []);
  const closeRoom = useCallback(() => setSelectedRoomId(null), []);
  const [logMode, setLogMode] = useState<RoomLogMode>("NEW");

  return {
    activeTab,
    go,
    tickets,
    setTickets,
    liveRooms,
    patchRoom,
    isPending,
    run,
    runForResult,
    flash,
    selectedRoom,
    openRoom,
    closeRoom,
    logMode,
    setLogMode,
  };
}
