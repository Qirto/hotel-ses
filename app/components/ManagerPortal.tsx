"use client";

import { useCallback, useMemo, useState } from "react";
import { BedDouble, ChartColumn, ClipboardList, Hotel, LayoutDashboard, Sparkles, Timer, TriangleAlert } from "lucide-react";
import type { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { NoticeProvider } from "@/components/app/notice";
import { TabPanel } from "@/components/app/TabPanel";
import { Panel, PageStack } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { RoomDetail } from "@/components/features/RoomDetail";
import type { NewTicketInput, PastIncidentInput } from "@/components/features/Forms";
import { useTicketActions } from "@/components/features/TicketActions";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { UrgentTicketsPanel } from "@/components/features/views/UrgentTicketsPanel";
import { RoomStatusChart } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { RoomLogForms } from "@/components/features/room/RoomLogForms";
import { AnalyticsView } from "@/components/features/gm/AnalyticsView";
import { usePortalState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { countOpenTickets, countRoomsNeedingAttention, isUrgentOpenTicket } from "@/lib/tickets";
import { roomStatusCounts, type RoomFilter } from "@/lib/rooms";
import { plural } from "@/lib/format";
import { createHistoricalReclamation, createRapidReclamation, resolveReclamation } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  staff: Staff[];
  isLiveSupabase?: boolean;
}

type Tab = "STATS" | "ROOMS" | "RECLAMATIONS" | "ANALYTICS";

export default function ManagerPortal(props: Props) {
  return (
    <NoticeProvider>
      <ManagerPortalView {...props} />
    </NoticeProvider>
  );
}

function ManagerPortalView({ rooms, reclamations, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "STATS", rooms, reclamations });
  const { activeTab, go, tickets, setTickets, liveRooms, isPending, run, runForResult, flash, selectedRoom, openRoom } = p;

  useRealtimeRefresh("realtime-manager", ["rooms", "reclamations"], isLiveSupabase);

  /* ───────────── derived data ───────────── */
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const counts = useMemo(() => roomStatusCounts(liveRooms), [liveRooms]);
  const urgentOpen = useMemo(() => tickets.filter(isUrgentOpenTicket).slice(0, 5), [tickets]);

  const { mttr, resolvedShare } = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === "RESOLVED" && t.created_at && t.resolved_at);
    const minutes = resolved.length
      ? Math.round(resolved.reduce((acc, t) => acc + (new Date(t.resolved_at!).getTime() - new Date(t.created_at!).getTime()) / 60000, 0) / resolved.length)
      : null;
    const share = tickets.length ? Math.round(((tickets.length - countOpenTickets(tickets)) / tickets.length) * 100) : null;
    return { mttr: minutes, resolvedShare: share };
  }, [tickets]);

  const occupancyPct = liveRooms.length ? Math.round((counts.occupied / liveRooms.length) * 100) : 0;

  /* ───────────── actions ───────────── */
  const resolveTicket = useCallback(
    (id: number) =>
      run(async () => {
        await resolveReclamation(id, "Resolved by General Manager Oversight");
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "RESOLVED", resolved_at: new Date().toISOString() } : t)));
        flash("success", "Ticket resolved.");
      }),
    [run, setTickets, flash]
  );
  const ticketActions = useTicketActions({ pending: isPending, onResolve: resolveTicket });
  const cycleCleaning = useCleaningCycle(p);

  const createDirective = useCallback(
    async (input: NewTicketInput) => {
      if (!selectedRoom) return false;
      return runForResult(async () => {
        const res = await createRapidReclamation({
          roomId: selectedRoom.id,
          department: input.department,
          category: input.category,
          priority: input.priority,
          description: input.description || `GM directive for room ${selectedRoom.room_number}`,
        });
        if (res.success && res.data) setTickets((prev) => [res.data as Reclamation, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Ticket created for room ${selectedRoom.room_number}.` : "Could not create the ticket.");
        return Boolean(res.success);
      });
    },
    [selectedRoom, runForResult, setTickets, flash]
  );

  const recordPast = useCallback(
    async (input: PastIncidentInput) => {
      if (!selectedRoom) return false;
      return runForResult(async () => {
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
        return Boolean(res.success);
      });
    },
    [selectedRoom, runForResult, setTickets, flash]
  );

  /* ───────────── navigation ───────────── */
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("ALL");
  const showRooms = useCallback(
    (filter: RoomFilter) => {
      setRoomFilter(filter);
      go("ROOMS");
    },
    [go]
  );
  const showTickets = useCallback(() => go("RECLAMATIONS"), [go]);

  const navItems = useMemo<NavTabItem[]>(
    () => [
      { id: "STATS", label: "Dashboard", icon: <LayoutDashboard aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "ANALYTICS", label: "Analytics", icon: <ChartColumn aria-hidden />, isActive: activeTab === "ANALYTICS", onClick: () => go("ANALYTICS") },
    ],
    [activeTab, attentionCount, openCount, go]
  );

  return (
    <AppShell items={navItems} departmentName="Executive Management" departmentCode="GM">
      <PageStack>
        <TabPanel active={activeTab === "STATS"}>
          <KpiGrid>
            <Kpi label="Occupancy" value={`${occupancyPct}%`} hint={`${counts.occupied} of ${liveRooms.length} rooms`} icon={<Hotel />} />
            <Kpi label="Ready to sell" value={counts.vacantClean} hint="Vacant and clean" tone="success" icon={<Sparkles />} onClick={() => showRooms("VACANT_CLEAN")} />
            <Kpi label="Needs attention" value={attentionCount} hint="Dirty or open issue" tone={attentionCount ? "warning" : "neutral"} icon={<TriangleAlert />} onClick={() => showRooms("ATTENTION")} />
            <Kpi label="Open tickets" value={openCount} hint={mttr != null ? `Avg fix ${mttr} min` : "No resolved tickets yet"} tone={openCount ? "danger" : "neutral"} icon={<ClipboardList />} onClick={showTickets} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <Panel title="Room status" description="Where all rooms stand right now" icon={<BedDouble />}>
              <RoomStatusChart rooms={liveRooms} />
            </Panel>
            <Panel title="Resolution" description="Tickets closed and time to fix" icon={<Timer />}>
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Resolved" value={resolvedShare != null ? `${resolvedShare}%` : "–"} hint={plural(tickets.length, "ticket")} tone="success" />
                <Kpi label="Avg time to fix" value={mttr != null ? `${mttr} min` : "–"} hint="Resolved tickets" />
              </div>
              <div className="mt-5">
                <TicketsByDepartmentChart tickets={tickets} height={200} />
              </div>
            </Panel>
          </div>

          <UrgentTicketsPanel
            title="Urgent open tickets"
            description="Emergency and high priority"
            tickets={urgentOpen}
            actions={ticketActions}
            onViewAll={showTickets}
          />
        </TabPanel>

        <TabPanel active={activeTab === "ROOMS"}>
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={roomFilter} onFilterChange={setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} actions={ticketActions} />
        </TabPanel>

        <AnalyticsView active={activeTab === "ANALYTICS"} rooms={liveRooms} tickets={tickets} onOpenRoom={openRoom} />
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={p.closeRoom}
        ticketActions={ticketActions}
        controls={selectedRoom && <HousekeepingControl room={selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
        logForm={
          <RoomLogForms
            mode={p.logMode}
            onModeChange={p.setLogMode}
            onCreate={createDirective}
            onRecordPast={recordPast}
            pending={isPending}
            newLabel="New directive"
            submitLabel="Create ticket"
          />
        }
      />
    </AppShell>
  );
}
