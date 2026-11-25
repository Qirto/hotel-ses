"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  BedDouble,
  Building2,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  ConciergeBell,
  Hotel,
  Layers,
  LayoutDashboard,
  ListFilter,
  LogIn,
  LogOut,
  Send,
  Siren,
  Sparkles,
  TriangleAlert,
  Users,
  History,
  Eye,
} from "lucide-react";
import type { Department, HotelRoom, Reclamation, Resident, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { Fab } from "@/components/app/Fab";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/donut-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { Panel, PageStack, EmptyState } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, PillGroup, SearchInput, SelectField } from "@/components/features/Filters";
import { RoomGrid } from "@/components/features/RoomGrid";
import { TicketTable } from "@/components/features/TicketTable";
import { RoomDetail, TicketCard } from "@/components/features/RoomDetail";
import { Field, NewTicketForm, Notice, PastIncidentForm, Segmented, TextInput, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { countOpenTickets, countRoomsNeedingAttention, isOpenTicket } from "@/lib/tickets";
import { CLEANING_LABEL, ticketStatsByRoom } from "@/lib/rooms";
import { departmentLabel, plural } from "@/lib/format";
import {
  acknowledgeReclamation,
  createHistoricalReclamation,
  createRapidReclamation,
  cycleRoomCleaning,
  resolveReclamation,
  updateRoomStayState,
} from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents?: Resident[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  staffList?: Staff[];
  isLiveSupabase?: boolean;
}

type Tab = "OVERVIEW" | "ROOMS" | "RECLAMATIONS" | "STATS";
type DateRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE";
type RoomFilter = "ALL" | "ATTENTION" | "OCCUPIED" | "VACANT" | "VACANT_CLEAN" | "DIRTY";
type StayState = "OCCUPIED" | "VACANT_DIRTY";

const NEXT_CLEANING: Record<HotelRoom["cleaning_status"], HotelRoom["cleaning_status"]> = {
  DIRTY: "CLEANING",
  CLEANING: "INSPECTING",
  INSPECTING: "CLEAN",
  CLEAN: "DIRTY",
};

const STAY_ACTIONS: { state: StayState; label: string; icon: ReactNode }[] = [
  { state: "OCCUPIED", label: "Check in", icon: <LogIn className="size-4" aria-hidden /> },
  { state: "VACANT_DIRTY", label: "Check out", icon: <LogOut className="size-4" aria-hidden /> },
];

const STAY_RESULT: Record<StayState, Partial<HotelRoom>> = {
  OCCUPIED: { is_occupied: true },
  VACANT_DIRTY: { is_occupied: false, cleaning_status: "DIRTY" },
};

const STAY_MESSAGE: Record<StayState, string> = {
  OCCUPIED: "checked in",
  VACANT_DIRTY: "checked out and marked dirty",
};

const DATE_RANGES = [
  { value: "ALL", label: "All time" },
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "7 days" },
  { value: "MONTH", label: "30 days" },
  { value: "ARCHIVE", label: "Older" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const DAY_MS = 864e5;

export default function ReceptionPortal({ rooms, departmentsList = [], reclamationsList = [], isLiveSupabase = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("OVERVIEW");
  const [, startTabTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Local copy so optimistic updates show instantly; server refreshes replace it.
  const [tickets, setTickets] = useState<Reclamation[]>(reclamationsList);
  useEffect(() => setTickets(reclamationsList), [reclamationsList]);
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

  useRealtimeRefresh("realtime-reception", ["reclamations", "rooms"], isLiveSupabase);

  const flash = useCallback((tone: "success" | "danger", text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3500);
  }, []);
  const noticeEl = notice && <Notice tone={notice.tone}>{notice.text}</Notice>;

  /* ───────────── derived data ───────────── */
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const roomStats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);

  const roomCounts = useMemo(() => {
    let occupied = 0;
    let vacant = 0;
    let vacantClean = 0;
    let vacantDirty = 0;
    let dirty = 0;
    for (const r of liveRooms) {
      if (r.is_occupied) occupied++;
      else {
        vacant++;
        if (r.cleaning_status === "CLEAN") vacantClean++;
        if (r.cleaning_status === "DIRTY") vacantDirty++;
      }
      if (r.cleaning_status === "DIRTY") dirty++;
    }
    return { occupied, vacant, vacantClean, vacantDirty, dirty, inCleaning: vacant - vacantClean - vacantDirty };
  }, [liveRooms]);
  const occupancyPct = liveRooms.length ? `${Math.round((roomCounts.occupied / liveRooms.length) * 100)}%` : "–";

  const urgentOpen = useMemo(
    () => tickets.filter((t) => isOpenTicket(t) && (t.priority === "EMERGENCY" || t.priority === "HIGH")),
    [tickets]
  );

  const byDepartment = useMemo(() => {
    const counts = new Map<string, { open: number; resolved: number }>();
    for (const t of tickets) {
      const c = counts.get(t.department) ?? { open: 0, resolved: 0 };
      if (isOpenTicket(t)) c.open++;
      else c.resolved++;
      counts.set(t.department, c);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].open + b[1].resolved - (a[1].open + a[1].resolved))
      .slice(0, 6)
      .map(([dept, c]) => ({ label: departmentLabel(dept), open: c.open, resolved: c.resolved }));
  }, [tickets]);

  /* ───────────── rooms tab ───────────── */
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloor, setRoomFloor] = useState<number | "ALL">("ALL");
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("ALL");
  const floors = useMemo(() => [...new Set(liveRooms.map((r) => r.floor))].sort((a, b) => a - b), [liveRooms]);
  const filteredRooms = useMemo(
    () =>
      liveRooms.filter((r) => {
        if (roomSearch && !r.room_number.includes(roomSearch.trim())) return false;
        if (roomFloor !== "ALL" && r.floor !== roomFloor) return false;
        const s = roomStats.get(r.id);
        if (roomFilter === "ATTENTION" && !(r.cleaning_status === "DIRTY" || (s && s.open > 0))) return false;
        if (roomFilter === "OCCUPIED" && !r.is_occupied) return false;
        if (roomFilter === "VACANT" && r.is_occupied) return false;
        if (roomFilter === "VACANT_CLEAN" && (r.is_occupied || r.cleaning_status !== "CLEAN")) return false;
        if (roomFilter === "DIRTY" && r.cleaning_status !== "DIRTY") return false;
        return true;
      }),
    [liveRooms, roomSearch, roomFloor, roomFilter, roomStats]
  );

  /* ───────────── tickets tab ───────────── */
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("ALL");
  const deptOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tickets) if (t.department) counts.set(t.department, (counts.get(t.department) ?? 0) + 1);
    for (const d of departmentsList) if (!counts.has(d.code)) counts.set(d.code, 0);
    return [
      { value: "ALL", label: `All departments (${tickets.length})` },
      ...[...counts.entries()]
        .sort((a, b) => departmentLabel(a[0]).localeCompare(departmentLabel(b[0])))
        .map(([code, n]) => ({ value: code, label: `${departmentLabel(code)} (${n})` })),
    ];
  }, [tickets, departmentsList]);
  const filteredTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (deptFilter !== "ALL" && t.department !== deptFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (dateRange !== "ALL" && t.created_at) {
        const days = (now - new Date(t.created_at).getTime()) / DAY_MS;
        if (dateRange === "TODAY" && days > 1) return false;
        if (dateRange === "WEEK" && days > 7) return false;
        if (dateRange === "MONTH" && days > 30) return false;
        if (dateRange === "ARCHIVE" && days <= 30) return false;
      }
      return true;
    });
  }, [tickets, deptFilter, statusFilter, dateRange]);

  /* ───────────── ticket actions (optimistic, reverted on failure) ───────────── */
  const updateTicket = useCallback(
    (id: number, patch: Partial<Reclamation>, run: () => Promise<{ success: boolean }>, ok: string, fail: string) => {
      let previous: Reclamation | undefined;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          previous = t;
          return { ...t, ...patch };
        })
      );
      startTransition(async () => {
        const res = await run();
        if (res.success) flash("success", ok);
        else {
          if (previous) setTickets((prev) => prev.map((t) => (t.id === id ? previous! : t)));
          flash("danger", fail);
        }
      });
    },
    [flash]
  );

  const acknowledgeTicket = useCallback(
    (id: number) =>
      updateTicket(id, { status: "IN_PROGRESS" }, () => acknowledgeReclamation(id), "Ticket marked in progress.", "Could not update the ticket."),
    [updateTicket]
  );
  const resolveTicket = useCallback(
    (id: number) =>
      updateTicket(
        id,
        { status: "RESOLVED", resolved_at: new Date().toISOString() },
        () => resolveReclamation(id, "Resolved by Reception"),
        "Ticket resolved.",
        "Could not resolve the ticket."
      ),
    [updateTicket]
  );

  const ticketActions = useCallback(
    (t: Reclamation) =>
      isOpenTicket(t) ? (
        <>
          {t.status === "OPEN" && (
            <Button size="md" variant="secondary" onClick={() => acknowledgeTicket(t.id)} disabled={isPending} leftIcon={<Eye className="size-4" aria-hidden />}>
              Acknowledge
            </Button>
          )}
          <Button size="md" variant="success" onClick={() => resolveTicket(t.id)} disabled={isPending} leftIcon={<CircleCheck className="size-4" aria-hidden />}>
            Resolve
          </Button>
        </>
      ) : null,
    [acknowledgeTicket, resolveTicket, isPending]
  );

  /* ───────────── room detail + actions ───────────── */
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const openRoom = useCallback((room: HotelRoom) => setSelectedRoomId(room.id), []);
  const [logMode, setLogMode] = useState<"NEW" | "PAST">("NEW");

  const setStayState = (room: HotelRoom, state: StayState) =>
    startTransition(async () => {
      const res = await updateRoomStayState(room.id, state);
      if (res.success) {
        patchRoom(room.id, STAY_RESULT[state]);
        flash("success", `Room ${room.room_number} ${STAY_MESSAGE[state]}.`);
      } else flash("danger", "Could not update the stay state.");
    });

  const cycleCleaning = (room: HotelRoom) => {
    const next = NEXT_CLEANING[room.cleaning_status] ?? "DIRTY";
    startTransition(async () => {
      const res = await cycleRoomCleaning(room.id, next);
      if (res.success) {
        patchRoom(room.id, { cleaning_status: next });
        flash("success", `Room ${room.room_number} set to ${CLEANING_LABEL[next].toLowerCase()}.`);
      } else flash("danger", "Could not update the cleaning status.");
    });
  };

  /** Room-scoped dispatch, shared by the room detail and the quick-dispatch sheet. */
  const dispatchTicket = (room: HotelRoom, input: NewTicketInput, fallback: string) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createRapidReclamation({
          roomId: room.id,
          department: input.department,
          category: input.category,
          description: input.description || fallback,
          priority: input.priority,
          isConfidential: false,
        });
        if (res.success && res.data) setTickets((prev) => [{ ...(res.data as Reclamation), room: { room_number: room.room_number } }, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Ticket dispatched for room ${room.room_number}.` : res.error || "Could not create the ticket.");
        resolve(Boolean(res.success));
      })
    );

  const recordPastIncident = (room: HotelRoom, input: PastIncidentInput, fallback: string) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createHistoricalReclamation({
          roomId: room.id,
          department: input.department,
          category: input.category,
          description: input.description || fallback,
          status: input.status,
          createdAt: input.createdAt,
          isConfidential: false,
        });
        if (res.success && res.data) setTickets((prev) => [{ ...(res.data as Reclamation), room: { room_number: room.room_number } }, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Past incident recorded for room ${room.room_number}.` : res.error || "Could not record the incident.");
        resolve(Boolean(res.success));
      })
    );

  const createInRoom = async (input: NewTicketInput) =>
    selectedRoom ? dispatchTicket(selectedRoom, input, `${input.category} issue logged via Room Modal`) : false;
  const recordInRoom = async (input: PastIncidentInput) =>
    selectedRoom ? recordPastIncident(selectedRoom, input, `Historical log for Room ${selectedRoom.room_number}`) : false;

  /* ───────────── global sheets (room typed by hand) ───────────── */
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);

  const findRoom = (number?: string) => {
    const room = number ? rooms.find((r) => r.room_number === number) : undefined;
    if (!room) flash("danger", number ? `No room numbered ${number}.` : "Enter a room number.");
    return room;
  };

  const quickDispatch = async (input: NewTicketInput) => {
    const room = findRoom(input.room);
    if (!room) return false;
    const ok = await dispatchTicket(room, input, `${input.category} incident reported via Quick Dispatch`);
    if (ok) setDispatchOpen(false);
    return ok;
  };

  const backfill = async (input: PastIncidentInput) => {
    const room = findRoom(input.room);
    if (!room) return false;
    const ok = await recordPastIncident(room, input, `Historical logbook entry for ${input.category}`);
    if (ok) setBackfillOpen(false);
    return ok;
  };

  /* ───────────── navigation ───────────── */
  const go = useCallback((tab: Tab) => startTabTransition(() => setActiveTab(tab)), []);
  const showRooms = (filter: RoomFilter) => {
    setRoomFilter(filter);
    go("ROOMS");
  };
  const navItems = useMemo<NavTabItem[]>(
    () => [
      { id: "OVERVIEW", label: "Overview", icon: <LayoutDashboard aria-hidden />, isActive: activeTab === "OVERVIEW", onClick: () => go("OVERVIEW") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "STATS", label: "Stats", icon: <ChartColumn aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
    ],
    [activeTab, attentionCount, openCount, go]
  );

  return (
    <AppShell
      items={navItems}
      departmentName="Reception Operations"
      departmentCode="Reception"
    >
      <PageStack>
        {noticeEl}

        {activeTab === "OVERVIEW" && (
          <>
            <Panel title="Front desk" description="Live room status, guest requests and dispatch." icon={<ConciergeBell />}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="primary" size="lg" onClick={() => setDispatchOpen(true)} leftIcon={<Send className="size-4" aria-hidden />} className="justify-center">
                  Dispatch ticket
                </Button>
                <Button variant="outline" size="lg" onClick={() => setBackfillOpen(true)} leftIcon={<History className="size-4" aria-hidden />} className="justify-center">
                  Past logbook
                </Button>
              </div>
            </Panel>

            <KpiGrid>
              <Kpi label="Occupied" value={roomCounts.occupied} hint={`${occupancyPct} of ${plural(liveRooms.length, "room")}`} icon={<Hotel />} onClick={() => showRooms("OCCUPIED")} />
              <Kpi label="Vacant and clean" value={roomCounts.vacantClean} hint="Ready for check-in" tone="success" icon={<Sparkles />} onClick={() => showRooms("VACANT_CLEAN")} />
              <Kpi label="Dirty rooms" value={roomCounts.dirty} hint="Waiting for housekeeping" tone={roomCounts.dirty ? "danger" : "neutral"} icon={<TriangleAlert />} onClick={() => showRooms("DIRTY")} />
              <Kpi label="Open tickets" value={openCount} hint={`${urgentOpen.length} urgent`} tone={openCount ? "warning" : "neutral"} icon={<ClipboardList />} onClick={() => go("RECLAMATIONS")} />
            </KpiGrid>

            <Panel
              title="Urgent tickets"
              description={`${plural(urgentOpen.length, "open ticket")} with emergency or high priority`}
              icon={<Siren />}
              actions={<Button size="md" variant="ghost" onClick={() => go("RECLAMATIONS")}>View all</Button>}
            >
              {urgentOpen.length === 0 ? (
                <EmptyState icon={<CircleCheck />} title="Nothing urgent" description="No emergency or high-priority tickets are open." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {urgentOpen.map((t) => (
                    <TicketCard key={t.id} ticket={t} actions={ticketActions(t)} />
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}

        {activeTab === "ROOMS" && (
          <Panel title="Rooms" description={`${filteredRooms.length} of ${liveRooms.length} rooms`} icon={<BedDouble />}>
            <div className="mb-5 flex flex-col gap-3">
              <FilterBar>
                <SearchInput label="Search rooms" placeholder="Room number" value={roomSearch} onChange={setRoomSearch} />
                <SelectField
                  label="Floor"
                  icon={<Layers />}
                  value={roomFloor}
                  onChange={setRoomFloor}
                  options={[{ value: "ALL" as const, label: "All floors" }, ...floors.map((f) => ({ value: f, label: `Floor ${f}` }))]}
                />
              </FilterBar>
              <PillGroup
                label="Room status"
                value={roomFilter}
                onChange={setRoomFilter}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "ATTENTION", label: "Needs attention", count: attentionCount },
                  { value: "OCCUPIED", label: "Occupied", count: roomCounts.occupied },
                  { value: "VACANT", label: "Vacant", count: roomCounts.vacant },
                  { value: "VACANT_CLEAN", label: "Ready", count: roomCounts.vacantClean },
                  { value: "DIRTY", label: "Dirty", count: roomCounts.dirty },
                ]}
              />
            </div>
            <RoomGrid rooms={filteredRooms} tickets={tickets} onSelect={openRoom} />
          </Panel>
        )}

        {activeTab === "RECLAMATIONS" && (
          <Panel title="Tickets" description={`${plural(filteredTickets.length, "ticket")} · ${openCount} open`} icon={<ClipboardList />}>
            <div className="mb-4 flex flex-col gap-3">
              <FilterBar>
                <SelectField label="Department" icon={<Building2 />} value={deptFilter} onChange={setDeptFilter} options={deptOptions} />
                <SelectField label="Status" icon={<ListFilter />} value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              </FilterBar>
              <PillGroup label="Date range" value={dateRange} onChange={setDateRange} options={DATE_RANGES} />
            </div>
            <TicketTable tickets={filteredTickets} actions={ticketActions} />
          </Panel>
        )}

        {activeTab === "STATS" && (
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <Panel title="Room status" description="Where all rooms stand right now" icon={<BedDouble />}>
              {liveRooms.length === 0 ? (
                <EmptyState icon={<BedDouble />} title="No rooms loaded" />
              ) : (
                <DonutChart
                  data={[
                    { label: "Occupied", value: roomCounts.occupied, color: "var(--text-primary)" },
                    { label: "Ready", value: roomCounts.vacantClean, color: "var(--success)" },
                    { label: "Dirty", value: roomCounts.vacantDirty, color: "var(--danger)" },
                    { label: "In cleaning", value: Math.max(0, roomCounts.inCleaning), color: "var(--warning)" },
                  ]}
                  centerLabel="Rooms"
                  size={200}
                  ariaLabel="Room status breakdown"
                />
              )}
            </Panel>
            <Panel title="Tickets by department" description="Open and resolved, busiest departments first" icon={<ChartColumn />}>
              {byDepartment.length > 0 ? (
                <BarChart
                  data={byDepartment}
                  series={[
                    { key: "open", label: "Open", color: "var(--danger)" },
                    { key: "resolved", label: "Resolved", color: "var(--success)" },
                  ]}
                  variant="stacked"
                  height={220}
                  ariaLabel="Tickets by department"
                />
              ) : (
                <EmptyState icon={<ClipboardList />} title="No tickets yet" />
              )}
            </Panel>
          </div>
        )}
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={() => setSelectedRoomId(null)}
        ticketActions={ticketActions}
        controls={
          selectedRoom && (
            <div className="flex flex-col gap-4">
              {noticeEl}
              <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Stay</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAY_ACTIONS.map((a) => (
                    <Button key={a.state} variant="secondary" size="md" onClick={() => setStayState(selectedRoom, a.state)} disabled={isPending} leftIcon={a.icon} className="justify-center px-2">
                      {a.label}
                    </Button>
                  ))}
                </div>
              </section>              <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Housekeeping</p>
                <p className="text-sm text-fg-muted">
                  Currently {CLEANING_LABEL[selectedRoom.cleaning_status].toLowerCase()}. Next step:{" "}
                  {CLEANING_LABEL[NEXT_CLEANING[selectedRoom.cleaning_status]].toLowerCase()}.
                </p>
                <Button variant="secondary" onClick={() => cycleCleaning(selectedRoom)} isLoading={isPending} loadingText="Updating" className="mt-1 w-full justify-center sm:w-auto">
                  Mark as {CLEANING_LABEL[NEXT_CLEANING[selectedRoom.cleaning_status]].toLowerCase()}
                </Button>
              </section>
            </div>
          )
        }
        logForm={
          <div className="flex flex-col gap-4">
            {noticeEl}
            <Segmented
              label="Type"
              value={logMode}
              onChange={setLogMode}
              options={[
                { value: "NEW", label: "New ticket" },
                { value: "PAST", label: "Past incident" },
              ]}
            />
            {logMode === "NEW" ? (
              <NewTicketForm onSubmit={createInRoom} pending={isPending} />
            ) : (
              <PastIncidentForm onSubmit={recordInRoom} pending={isPending} />
            )}
          </div>
        }
      />

      <Fab label="Dispatch ticket" onClick={() => setDispatchOpen(true)} />

      <ResponsiveSheet open={dispatchOpen} onOpenChange={setDispatchOpen} title="Dispatch ticket" description="Log and route a guest request now.">
        <div className="flex flex-col gap-4">
          {noticeEl}
          <NewTicketForm withRoom onSubmit={quickDispatch} pending={isPending} />
        </div>
      </ResponsiveSheet>

      <ResponsiveSheet open={backfillOpen} onOpenChange={setBackfillOpen} title="Backfill past incident" description="Add an older ticket to a room's history with its real date.">
        <div className="flex flex-col gap-4">
          {noticeEl}
          <PastIncidentForm withRoom onSubmit={backfill} pending={isPending} />
        </div>
      </ResponsiveSheet>
    </AppShell>
  );
}
