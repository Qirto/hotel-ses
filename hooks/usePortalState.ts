"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { isOffline, OFFLINE_MESSAGE } from "@/lib/connection";
import { countOpenTickets, countRoomsNeedingAttention } from "@/lib/tickets";
import type { RoomFilter } from "@/lib/rooms";
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
  /** Runs a server action; refused while offline, recovers if the connection drops mid-request. */
  run: (action: () => Promise<void>) => void;
  /** `run` for forms: resolves `true` when the action succeeded (the form then resets). */
  runForResult: (action: () => Promise<boolean>) => Promise<boolean>;

  flash: Flash;

  /** Room detail sheet. */
  selectedRoom: HotelRoom | null;
  openRoom: (room: HotelRoom) => void;
  closeRoom: () => void;
  logMode: RoomLogMode;
  setLogMode: (mode: RoomLogMode) => void;

  /** Badge counts shown by every portal (nav + KPIs). */
  openCount: number;
  attentionCount: number;

  /** Rooms tab status filter, and jumps from KPIs/panels to the Rooms and Tickets tabs. */
  roomFilter: RoomFilter;
  setRoomFilter: (filter: RoomFilter) => void;
  showRooms: (filter: RoomFilter) => void;
  showTickets: () => void;
}

/** Tabs every portal has; `showRooms` / `showTickets` switch to them. */
export type SharedTab = "ROOMS" | "RECLAMATIONS";

/**
 * The state plumbing every portal shares. Needs a `NoticeProvider` above the
 * calling component (for `flash`).
 */
export function usePortalState<Tab extends SharedTab | (string & {})>({
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

  const flash = useFlash();
  const router = useRouter();

  // Every server action goes through these two. Offline: refuse up front, so no
  // optimistic change is shown for something that was never sent. Connection
  // lost mid-request: say so and refetch, so the screen shows the real state.
  const [isPending, startAction] = useTransition();
  const lostConnection = useCallback(() => {
    flash("danger", "Connexion perdue. La modification n’a peut-être pas été enregistrée ; affichage des données les plus récentes.");
    router.refresh();
  }, [flash, router]);

  const run = useCallback(
    (action: () => Promise<void>) => {
      if (isOffline()) return flash("danger", OFFLINE_MESSAGE);
      startAction(async () => {
        try {
          await action();
        } catch {
          lostConnection();
        }
      });
    },
    [flash, lostConnection]
  );

  const runForResult = useCallback(
    (action: () => Promise<boolean>) => {
      if (isOffline()) {
        flash("danger", OFFLINE_MESSAGE);
        return Promise.resolve(false);
      }
      return new Promise<boolean>((resolve) =>
        startAction(async () => {
          try {
            resolve(await action());
          } catch {
            lostConnection();
            resolve(false);
          }
        })
      );
    },
    [flash, lostConnection]
  );

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const openRoom = useCallback((room: HotelRoom) => setSelectedRoomId(room.id), []);
  const closeRoom = useCallback(() => setSelectedRoomId(null), []);
  const [logMode, setLogMode] = useState<RoomLogMode>("NEW");

  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);

  const [roomFilter, setRoomFilter] = useState<RoomFilter>("ALL");
  const showRooms = useCallback(
    (filter: RoomFilter) => {
      setRoomFilter(filter);
      go("ROOMS" as Tab);
    },
    [go]
  );
  const showTickets = useCallback(() => go("RECLAMATIONS" as Tab), [go]);

  return {
    openCount,
    attentionCount,
    roomFilter,
    setRoomFilter,
    showRooms,
    showTickets,
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
