"use client";

import { useMemo } from "react";
import { ChartColumn, ClipboardList, Hotel, LayoutDashboard, Sparkles, Timer, TriangleAlert } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import { navItem, sharedNavItems, type NavTabItem } from "@/components/app/nav";
import { withNotices } from "@/components/app/notice";
import { TabPanel } from "@/components/app/TabPanel";
import { Panel, PageStack } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { PortalRoomDetail } from "@/components/features/PortalRoomDetail";
import { useTicketActions } from "@/components/features/TicketActions";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { UrgentTicketsPanel } from "@/components/features/views/UrgentTicketsPanel";
import { RoomStatusPanel } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { AnalyticsView } from "@/components/features/gm/AnalyticsView";
import { usePortalState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { averageResolutionMinutes, isUrgentOpenTicket } from "@/lib/tickets";
import { roomStatusCounts } from "@/lib/rooms";
import { formatMinutes, percent, plural } from "@/lib/format";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  isLiveSupabase?: boolean;
}

type Tab = "STATS" | "ROOMS" | "RECLAMATIONS" | "ANALYTICS";

function ManagerPortalView({ rooms, reclamations, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "STATS", rooms, reclamations });
  const { activeTab, tickets, liveRooms, isPending, openRoom, openCount, attentionCount, showRooms, showTickets } = p;

  useRealtimeRefresh("realtime-manager", ["rooms", "reclamations"], isLiveSupabase);

  /* ───────────── derived data ───────────── */
  const counts = useMemo(() => roomStatusCounts(liveRooms), [liveRooms]);
  const urgentOpen = useMemo(() => tickets.filter(isUrgentOpenTicket).slice(0, 5), [tickets]);
  const mttr = useMemo(() => averageResolutionMinutes(tickets), [tickets]);

  /* ───────────── actions ───────────── */
  const ticketMutations = useTicketMutations(p, "General Manager");
  const ticketActions = useTicketActions({ pending: isPending, onResolve: ticketMutations.resolve });
  const cycleCleaning = useCleaningCycle(p);

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      navItem(p, "STATS", "Dashboard", <LayoutDashboard aria-hidden />),
      ...sharedNavItems(p),
      navItem(p, "ANALYTICS", "Analytics", <ChartColumn aria-hidden />),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, attentionCount, openCount, p.go]
  );

  return (
    <AppShell role="gm" items={navItems}>
      <PageStack>
        <TabPanel active={activeTab === "STATS"}>
          <KpiGrid>
            <Kpi label="Occupancy" value={percent(counts.occupied, liveRooms.length)} hint={`${counts.occupied} of ${plural(liveRooms.length, "room")}`} icon={<Hotel />} />
            <Kpi label="Ready to sell" value={counts.vacantClean} hint="Vacant and clean" tone="success" icon={<Sparkles />} onClick={() => showRooms("VACANT_CLEAN")} />
            <Kpi label="Needs attention" value={attentionCount} hint="Dirty or open issue" tone={attentionCount ? "warning" : "neutral"} icon={<TriangleAlert />} onClick={() => showRooms("ATTENTION")} />
            <Kpi label="Open tickets" value={openCount} hint={mttr != null ? `Avg fix ${formatMinutes(mttr)}` : "No resolved tickets yet"} tone={openCount ? "danger" : "neutral"} icon={<ClipboardList />} onClick={showTickets} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <RoomStatusPanel rooms={liveRooms} />
            <Panel title="Resolution" description="Tickets closed and time to fix" icon={<Timer />}>
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Resolved" value={percent(tickets.length - openCount, tickets.length)} hint={plural(tickets.length, "ticket")} tone="success" />
                <Kpi label="Avg time to fix" value={formatMinutes(mttr)} hint="Resolved tickets" />
              </div>
              <div className="mt-5">
                <TicketsByDepartmentChart tickets={tickets} />
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
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={p.roomFilter} onFilterChange={p.setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} actions={ticketActions} />
        </TabPanel>

        <AnalyticsView active={activeTab === "ANALYTICS"} rooms={liveRooms} tickets={tickets} onOpenRoom={openRoom} />
      </PageStack>

      <PortalRoomDetail
        p={p}
        tickets={ticketMutations}
        ticketActions={ticketActions}
        controls={p.selectedRoom && <HousekeepingControl room={p.selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
      />
    </AppShell>
  );
}

export default withNotices(ManagerPortalView);
