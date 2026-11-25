"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BedDouble,
  Building2,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  Clock,
  Hotel,
  Layers,
  LayoutDashboard,
  ListFilter,
  Repeat,
  Siren,
  Sparkles,
  Timer,
  TriangleAlert,
} from "lucide-react";
import type { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/donut-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { Panel, PageStack, EmptyState } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, PillGroup, SearchInput, SelectField } from "@/components/features/Filters";
import { RoomGrid } from "@/components/features/RoomGrid";
import { TicketTable } from "@/components/features/TicketTable";
import { ProblemBars, RoomDetail, TicketCard } from "@/components/features/RoomDetail";
import { NewTicketForm, Notice, PastIncidentForm, Segmented, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { ToneBadge } from "@/components/features/StatusBadges";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { countOpenTickets, countRoomsNeedingAttention, isOpenTicket } from "@/lib/tickets";
import { CLEANING_LABEL, roomHeadline, ticketStatsByRoom } from "@/lib/rooms";
import { departmentLabel, plural } from "@/lib/format";
import { computeAllRoomsAnalytics } from "@/utils/roomAnalytics";
import { createHistoricalReclamation, createRapidReclamation, cycleRoomCleaning, resolveReclamation } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  staff: Staff[];
  isLiveSupabase?: boolean;
}

type Tab = "STATS" | "ROOMS" | "RECLAMATIONS" | "ANALYTICS";
type DateRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE";
type RoomFilter = "ALL" | "ATTENTION" | "OCCUPIED" | "VACANT_CLEAN" | "DIRTY";
type AnalyticsSort = "MOST_TICKETS" | "OPEN_TICKETS" | "RUSH_HOUR" | "ROOM_NUMBER";

const NEXT_CLEANING: Record<HotelRoom["cleaning_status"], HotelRoom["cleaning_status"]> = {
  DIRTY: "CLEANING",
  CLEANING: "INSPECTING",
  INSPECTING: "CLEAN",
  CLEAN: "DIRTY",
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

export default function ManagerPortal({ rooms, reclamations, isLiveSupabase = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("STATS");
  const [, startTabTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Local copy so optimistic updates show instantly; server refreshes replace it.
  const [tickets, setTickets] = useState<Reclamation[]>(reclamations);
  useEffect(() => setTickets(reclamations), [reclamations]);
  const [roomOverrides, setRoomOverrides] = useState<Record<number, Partial<HotelRoom>>>({});
  useEffect(() => setRoomOverrides({}), [rooms]);
  const liveRooms = useMemo(
    () => (Object.keys(roomOverrides).length ? rooms.map((r) => (roomOverrides[r.id] ? { ...r, ...roomOverrides[r.id] } : r)) : rooms),
    [rooms, roomOverrides]
  );

  useRealtimeRefresh("realtime-manager", ["rooms", "reclamations"], isLiveSupabase);

  const flash = useCallback((tone: "success" | "danger", text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

  /* ───────────── derived data ───────────── */
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const roomStats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);

  const occupied = useMemo(() => liveRooms.filter((r) => r.is_occupied).length, [liveRooms]);
  const vacantClean = useMemo(() => liveRooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length, [liveRooms]);
  const dirty = useMemo(() => liveRooms.filter((r) => r.cleaning_status === "DIRTY").length, [liveRooms]);
  // Exact partition for the status donut: occupied, then vacant split by cleaning state.
  const vacantDirty = useMemo(() => liveRooms.filter((r) => !r.is_occupied && r.cleaning_status === "DIRTY").length, [liveRooms]);
  const inProgressCleaning = liveRooms.length - occupied - vacantClean - vacantDirty;

  const { mttr, resolvedShare } = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === "RESOLVED" && t.created_at && t.resolved_at);
    const minutes = resolved.length
      ? Math.round(resolved.reduce((acc, t) => acc + (new Date(t.resolved_at!).getTime() - new Date(t.created_at!).getTime()) / 60000, 0) / resolved.length)
      : null;
    const share = tickets.length ? Math.round(((tickets.length - countOpenTickets(tickets)) / tickets.length) * 100) : null;
    return { mttr: minutes, resolvedShare: share };
  }, [tickets]);

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

  const urgentOpen = useMemo(
    () => tickets.filter((t) => isOpenTicket(t) && (t.priority === "EMERGENCY" || t.priority === "HIGH")).slice(0, 5),
    [tickets]
  );

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
  const departments = useMemo(() => [...new Set(tickets.map((t) => t.department).filter(Boolean))].sort(), [tickets]);
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

  /* ───────────── analytics tab ───────────── */
  const [aSearch, setASearch] = useState("");
  const [aFloor, setAFloor] = useState<number | "ALL">("ALL");
  const [aBlock, setABlock] = useState<string>("ALL");
  const [aSort, setASort] = useState<AnalyticsSort>("MOST_TICKETS");
  const analytics = useMemo(
    () => (activeTab === "ANALYTICS" ? computeAllRoomsAnalytics(liveRooms, tickets) : null),
    [activeTab, liveRooms, tickets]
  );
  const analyticsRooms = useMemo(() => {
    if (!analytics) return [];
    return liveRooms
      .filter((r) => (analytics.get(r.id)?.totalTickets ?? 0) > 0)
      .filter((r) => !aSearch || r.room_number.includes(aSearch.trim()))
      .filter((r) => aFloor === "ALL" || r.floor === aFloor)
      .filter((r) => aBlock === "ALL" || r.block === aBlock)
      .sort((a, b) => {
        const A = analytics.get(a.id)!;
        const B = analytics.get(b.id)!;
        if (aSort === "MOST_TICKETS") return B.totalTickets - A.totalTickets;
        if (aSort === "OPEN_TICKETS") return B.openTickets - A.openTickets;
        if (aSort === "RUSH_HOUR") return (B.rushHour?.count ?? 0) - (A.rushHour?.count ?? 0);
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      });
  }, [analytics, liveRooms, aSearch, aFloor, aBlock, aSort]);
  const analyticsSummary = useMemo(() => {
    if (!analytics) return null;
    let withIssues = 0;
    let withRush = 0;
    let top: { room: string; count: number } | null = null;
    analytics.forEach((s) => {
      if (s.totalTickets > 0) {
        withIssues++;
        if (!top || s.totalTickets > top.count) top = { room: s.roomNumber, count: s.totalTickets };
      }
      if (s.rushHour) withRush++;
    });
    return { withIssues, withRush, top: top as { room: string; count: number } | null };
  }, [analytics]);

  /* ───────────── room detail + actions ───────────── */
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const openRoom = useCallback((room: HotelRoom) => setSelectedRoomId(room.id), []);
  const [logMode, setLogMode] = useState<"NEW" | "PAST">("NEW");

  const resolveTicket = useCallback(
    (id: number) =>
      startTransition(async () => {
        await resolveReclamation(id, "Resolved by General Manager Oversight");
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "RESOLVED", resolved_at: new Date().toISOString() } : t))
        );
        flash("success", "Ticket resolved.");
      }),
    [flash]
  );

  const cycleCleaning = (room: HotelRoom) => {
    const next = NEXT_CLEANING[room.cleaning_status] ?? "DIRTY";
    startTransition(async () => {
      const res = await cycleRoomCleaning(room.id, next);
      if (res.success) {
        setRoomOverrides((prev) => ({ ...prev, [room.id]: { ...prev[room.id], cleaning_status: next } }));
        flash("success", `Room ${room.room_number} set to ${CLEANING_LABEL[next].toLowerCase()}.`);
      } else flash("danger", "Could not update the cleaning status.");
    });
  };

  const createDirective = async (input: NewTicketInput) => {
    if (!selectedRoom) return false;
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createRapidReclamation({
          roomId: selectedRoom.id,
          department: input.department,
          category: input.category,
          priority: input.priority,
          description: input.description || `GM directive for room ${selectedRoom.room_number}`,
        });
        if (res.success && res.data) setTickets((prev) => [res.data as Reclamation, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Ticket created for room ${selectedRoom.room_number}.` : "Could not create the ticket.");
        resolve(Boolean(res.success));
      })
    );
  };

  const recordPast = async (input: PastIncidentInput) => {
    if (!selectedRoom) return false;
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createHistoricalReclamation({
          roomId: selectedRoom.id,
          department: input.department,
          category: input.category,
          description: input.description,
          createdAt: input.createdAt,
          status: input.status,
        });
        if (res.success && res.data) setTickets((prev) => [res.data as Reclamation, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Past incident recorded for room ${selectedRoom.room_number}.` : res.error || "Could not record the incident.");
        resolve(Boolean(res.success));
      })
    );
  };

  const resolveAction = useCallback(
    (t: Reclamation) =>
      isOpenTicket(t) ? (
        <Button size="sm" variant="success" onClick={() => resolveTicket(t.id)} disabled={isPending} leftIcon={<CircleCheck className="size-3.5" aria-hidden />}>
          Resolve
        </Button>
      ) : null,
    [resolveTicket, isPending]
  );

  /* ───────────── navigation ───────────── */
  const go = useCallback((tab: Tab) => startTabTransition(() => setActiveTab(tab)), []);
  const navItems = useMemo<NavTabItem[]>(
    () => [
      { id: "STATS", label: "Dashboard", icon: <LayoutDashboard aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "ANALYTICS", label: "Analytics", icon: <ChartColumn aria-hidden />, isActive: activeTab === "ANALYTICS", onClick: () => go("ANALYTICS") },
    ],
    [activeTab, attentionCount, openCount, go]
  );

  const occupancyPct = liveRooms.length ? Math.round((occupied / liveRooms.length) * 100) : 0;

  return (
    <AppShell items={navItems} departmentName="Executive Management" departmentCode="GM">
      <PageStack>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        {activeTab === "STATS" && (
          <>
            <KpiGrid>
              <Kpi label="Occupancy" value={`${occupancyPct}%`} hint={`${occupied} of ${liveRooms.length} rooms`} icon={<Hotel />} />
              <Kpi label="Ready to sell" value={vacantClean} hint="Vacant and clean" tone="success" icon={<Sparkles />} onClick={() => { setRoomFilter("VACANT_CLEAN"); go("ROOMS"); }} />
              <Kpi label="Needs attention" value={attentionCount} hint="Dirty or open issue" tone={attentionCount ? "warning" : "neutral"} icon={<TriangleAlert />} onClick={() => { setRoomFilter("ATTENTION"); go("ROOMS"); }} />
              <Kpi label="Open tickets" value={openCount} hint={mttr != null ? `Avg fix ${mttr} min` : "No resolved tickets yet"} tone={openCount ? "danger" : "neutral"} icon={<ClipboardList />} onClick={() => go("RECLAMATIONS")} />
            </KpiGrid>

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              <Panel title="Room status" description="Where all rooms stand right now" icon={<BedDouble />}>
                <DonutChart
                  data={[
                    { label: "Occupied", value: occupied, color: "var(--text-primary)" },
                    { label: "Ready", value: vacantClean, color: "var(--success)" },
                    { label: "Dirty", value: vacantDirty, color: "var(--danger)" },
                    { label: "In cleaning", value: Math.max(0, inProgressCleaning), color: "var(--warning)" },
                  ]}
                  centerLabel="Rooms"
                  size={200}
                  ariaLabel="Room status breakdown"
                />
              </Panel>
              <Panel title="Resolution" description="Tickets closed and time to fix" icon={<Timer />}>
                <div className="grid grid-cols-2 gap-3">
                  <Kpi label="Resolved" value={resolvedShare != null ? `${resolvedShare}%` : "–"} hint={plural(tickets.length, "ticket")} tone="success" />
                  <Kpi label="Avg time to fix" value={mttr != null ? `${mttr} min` : "–"} hint="Resolved tickets" />
                </div>
                {byDepartment.length > 0 ? (
                  <div className="mt-5">
                    <BarChart
                      data={byDepartment}
                      series={[
                        { key: "open", label: "Open", color: "var(--danger)" },
                        { key: "resolved", label: "Resolved", color: "var(--success)" },
                      ]}
                      variant="stacked"
                      height={200}
                      ariaLabel="Tickets by department"
                    />
                  </div>
                ) : (
                  <EmptyState icon={<ClipboardList />} title="No tickets yet" />
                )}
              </Panel>
            </div>

            <Panel title="Urgent open tickets" description="Emergency and high priority" icon={<Siren />} actions={<Button size="sm" variant="ghost" onClick={() => go("RECLAMATIONS")}>View all</Button>}>
              {urgentOpen.length === 0 ? (
                <EmptyState icon={<CircleCheck />} title="Nothing urgent" description="No emergency or high-priority tickets are open." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {urgentOpen.map((t) => (
                    <TicketCard key={t.id} ticket={t} actions={resolveAction(t)} />
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
                  { value: "OCCUPIED", label: "Occupied", count: occupied },
                  { value: "VACANT_CLEAN", label: "Ready", count: vacantClean },
                  { value: "DIRTY", label: "Dirty", count: dirty },
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
                <SelectField
                  label="Department"
                  icon={<Building2 />}
                  value={deptFilter}
                  onChange={setDeptFilter}
                  options={[{ value: "ALL", label: "All departments" }, ...departments.map((d) => ({ value: d, label: departmentLabel(d) }))]}
                />
                <SelectField label="Status" icon={<ListFilter />} value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              </FilterBar>
              <PillGroup label="Date range" value={dateRange} onChange={setDateRange} options={DATE_RANGES} />
            </div>
            <TicketTable tickets={filteredTickets} actions={resolveAction} />
          </Panel>
        )}

        {activeTab === "ANALYTICS" && analyticsSummary && (
          <>
            <KpiGrid>
              <Kpi label="Rooms with tickets" value={analyticsSummary.withIssues} hint={`of ${liveRooms.length} rooms`} icon={<BedDouble />} />
              <Kpi label="Rush hours found" value={analyticsSummary.withRush} hint="Rooms with a peak hour" icon={<Clock />} />
              <Kpi
                label="Most reported room"
                value={analyticsSummary.top ? analyticsSummary.top.room : "–"}
                hint={analyticsSummary.top ? plural(analyticsSummary.top.count, "ticket") : "No tickets yet"}
                tone={analyticsSummary.top ? "warning" : "neutral"}
                icon={<Repeat />}
              />
              <Kpi label="Total tickets" value={tickets.length} hint={`${openCount} open`} icon={<ClipboardList />} />
            </KpiGrid>

            <Panel title="Room patterns" description="Peak complaint hours and repeated problems per room" icon={<ChartColumn />}>
              <div className="mb-5">
                <FilterBar>
                  <SearchInput label="Search rooms" placeholder="Room number" value={aSearch} onChange={setASearch} />
                  <SelectField label="Floor" icon={<Layers />} value={aFloor} onChange={setAFloor} options={[{ value: "ALL" as const, label: "All floors" }, ...floors.map((f) => ({ value: f, label: `Floor ${f}` }))]} />
                  <SelectField
                    label="Block"
                    icon={<Building2 />}
                    value={aBlock}
                    onChange={setABlock}
                    options={[
                      { value: "ALL", label: "All blocks" },
                      { value: "BLOCK_A", label: "Block A" },
                      { value: "BLOCK_B", label: "Block B" },
                    ]}
                  />
                  <SelectField
                    label="Sort"
                    icon={<ListFilter />}
                    value={aSort}
                    onChange={setASort}
                    options={[
                      { value: "MOST_TICKETS", label: "Most tickets" },
                      { value: "OPEN_TICKETS", label: "Most open" },
                      { value: "RUSH_HOUR", label: "Biggest rush" },
                      { value: "ROOM_NUMBER", label: "Room number" },
                    ]}
                  />
                </FilterBar>
              </div>

              {analyticsRooms.length === 0 ? (
                <EmptyState icon={<ChartColumn />} title="No rooms with tickets" description="Patterns appear once rooms have reported issues." />
              ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {analyticsRooms.map((room) => {
                    const s = analytics!.get(room.id)!;
                    const head = roomHeadline(room, roomStats.get(room.id));
                    return (
                      <li key={room.id} className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tabular-nums tracking-tight">Room {room.room_number}</p>
                            <p className="text-xs text-fg-muted">Floor {room.floor} · {room.block?.replace("BLOCK_", "Block ") ?? "Main"}</p>
                          </div>
                          <ToneBadge tone={head.tone}>{head.label}</ToneBadge>
                        </div>

                        <div className="rounded-lg border border-border bg-surface p-3">
                          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                            <Clock className="size-3.5" aria-hidden /> Rush hour
                          </p>
                          {s.rushHour ? (
                            <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
                              <span className="font-semibold tabular-nums">{s.rushHour.hourRange}</span>
                              <span className="text-xs text-fg-muted">{s.rushHour.date}</span>
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-fg-muted">No peak yet</p>
                          )}
                        </div>

                        <ProblemBars problems={s.topProblems.slice(0, 3)} />

                        <dl className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
                          {[
                            ["Total", s.totalTickets],
                            ["Resolved", s.resolvedTickets],
                            ["Open", s.openTickets],
                            ["Avg fix", s.avgResolutionMinutes != null ? `${Math.round(s.avgResolutionMinutes)}m` : "–"],
                          ].map(([k, v]) => (
                            <div key={k as string}>
                              <dt className="text-xs text-fg-muted">{k}</dt>
                              <dd className="mt-0.5 font-semibold tabular-nums">{v}</dd>
                            </div>
                          ))}
                        </dl>

                        <Button variant="secondary" onClick={() => openRoom(room)} className="w-full justify-center">
                          Open room
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </>
        )}
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={() => setSelectedRoomId(null)}
        ticketActions={resolveAction}
        controls={
          selectedRoom && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Housekeeping</p>
              <p className="text-sm text-fg-muted">
                Currently {CLEANING_LABEL[selectedRoom.cleaning_status].toLowerCase()}. Next step:{" "}
                {CLEANING_LABEL[NEXT_CLEANING[selectedRoom.cleaning_status]].toLowerCase()}.
              </p>
              <Button variant="secondary" onClick={() => cycleCleaning(selectedRoom)} isLoading={isPending} loadingText="Updating" className="mt-1 w-full justify-center sm:w-auto">
                Mark as {CLEANING_LABEL[NEXT_CLEANING[selectedRoom.cleaning_status]].toLowerCase()}
              </Button>
            </div>
          )
        }
        logForm={
          <div className="flex flex-col gap-4">
            <Segmented
              label="Type"
              value={logMode}
              onChange={setLogMode}
              options={[
                { value: "NEW", label: "New directive" },
                { value: "PAST", label: "Past incident" },
              ]}
            />
            {logMode === "NEW" ? (
              <NewTicketForm onSubmit={createDirective} pending={isPending} submitLabel="Create ticket" />
            ) : (
              <PastIncidentForm onSubmit={recordPast} pending={isPending} />
            )}
          </div>
        }
      />
    </AppShell>
  );
}
