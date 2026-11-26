"use client";

import { useCallback, useMemo, useState } from "react";
import { ChartColumn, ClipboardList, ConciergeBell, History, Hotel, LayoutDashboard, Send, Sparkles, TriangleAlert } from "lucide-react";
import type { Department, HotelRoom, Reclamation } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import { navItem, sharedNavItems, type NavTabItem } from "@/components/app/nav";
import { Fab } from "@/components/app/Fab";
import { withNotices } from "@/components/app/notice";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { TabPanel } from "@/components/app/TabPanel";
import { Button } from "@/components/ui/button";
import { Panel, PageStack } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { PortalRoomDetail } from "@/components/features/PortalRoomDetail";
import { NewTicketForm, PastIncidentForm, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { useTicketActions } from "@/components/features/TicketActions";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { UrgentTicketsPanel } from "@/components/features/views/UrgentTicketsPanel";
import { RoomStatusPanel } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { StayControl } from "@/components/features/room/StayControl";
import { usePortalState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { isUrgentOpenTicket } from "@/lib/tickets";
import { roomStatusCounts, STAY_MESSAGE, STAY_RESULT, type StayState } from "@/lib/rooms";
import { percent, plural } from "@/lib/format";
import { updateRoomStayState } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  isLiveSupabase?: boolean;
}

type Tab = "OVERVIEW" | "ROOMS" | "RECLAMATIONS" | "STATS";

const NO_DEPARTMENTS: Department[] = [];
const NO_TICKETS: Reclamation[] = [];

function ReceptionPortalView({ rooms, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "OVERVIEW", rooms, reclamations: reclamationsList });
  const { activeTab, tickets, liveRooms, patchRoom, isPending, run, flash, openRoom, openCount, showRooms, showTickets } = p;

  useRealtimeRefresh("realtime-reception", ["reclamations", "rooms"], isLiveSupabase);

  /* ───────────── derived data ───────────── */
  const counts = useMemo(() => roomStatusCounts(liveRooms), [liveRooms]);
  const urgentOpen = useMemo(() => tickets.filter(isUrgentOpenTicket), [tickets]);
  const departmentCodes = useMemo(() => departmentsList.map((d) => d.code), [departmentsList]);

  /* ───────────── actions ───────────── */
  const ticketMutations = useTicketMutations(p, "Reception");
  const ticketActions = useTicketActions({ pending: isPending, onAcknowledge: ticketMutations.acknowledge, onResolve: ticketMutations.resolve });
  const cycleCleaning = useCleaningCycle(p);
  const setStayState = useCallback(
    (room: HotelRoom, state: StayState) =>
      run(async () => {
        const res = await updateRoomStayState(room.id, state);
        if (res.success) {
          patchRoom(room.id, STAY_RESULT[state]);
          flash("success", `Room ${room.room_number} ${STAY_MESSAGE[state]}.`);
        } else flash("danger", "Could not update the stay state.");
      }),
    [run, patchRoom, flash]
  );

  /* ───────────── front desk sheets (room typed by hand) ───────────── */
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);

  const findRoom = (number?: string) => {
    const room = number ? rooms.find((r) => r.room_number === number) : undefined;
    if (!room) flash("danger", number ? `No room numbered ${number}.` : "Enter a room number.");
    return room;
  };
  const quickDispatch = async (input: NewTicketInput) => {
    const room = findRoom(input.room);
    const ok = room ? await ticketMutations.createTicket(room, input) : false;
    if (ok) setDispatchOpen(false);
    return ok;
  };
  const backfill = async (input: PastIncidentInput) => {
    const room = findRoom(input.room);
    const ok = room ? await ticketMutations.recordPast(room, input) : false;
    if (ok) setBackfillOpen(false);
    return ok;
  };

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      navItem(p, "OVERVIEW", "Overview", <LayoutDashboard aria-hidden />),
      ...sharedNavItems(p),
      navItem(p, "STATS", "Stats", <ChartColumn aria-hidden />),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, p.attentionCount, openCount, p.go]
  );

  return (
    <AppShell role="reception" items={navItems}>
      <PageStack>
        <TabPanel active={activeTab === "OVERVIEW"}>
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
            <Kpi label="Occupied" value={counts.occupied} hint={`${percent(counts.occupied, liveRooms.length)} of ${plural(liveRooms.length, "room")}`} icon={<Hotel />} onClick={() => showRooms("OCCUPIED")} />
            <Kpi label="Vacant and clean" value={counts.vacantClean} hint="Ready for check-in" tone="success" icon={<Sparkles />} onClick={() => showRooms("VACANT_CLEAN")} />
            <Kpi label="Dirty rooms" value={counts.dirty} hint="Waiting for housekeeping" tone={counts.dirty ? "danger" : "neutral"} icon={<TriangleAlert />} onClick={() => showRooms("DIRTY")} />
            <Kpi label="Open tickets" value={openCount} hint={`${urgentOpen.length} urgent`} tone={openCount ? "warning" : "neutral"} icon={<ClipboardList />} onClick={showTickets} />
          </KpiGrid>

          <UrgentTicketsPanel
            title="Urgent tickets"
            description={`${plural(urgentOpen.length, "open ticket")} with emergency or high priority`}
            tickets={urgentOpen}
            actions={ticketActions}
            onViewAll={showTickets}
          />
        </TabPanel>

        <TabPanel active={activeTab === "ROOMS"}>
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={p.roomFilter} onFilterChange={p.setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} actions={ticketActions} departments={departmentCodes} />
        </TabPanel>

        <TabPanel active={activeTab === "STATS"}>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <RoomStatusPanel rooms={liveRooms} />
            <Panel title="Tickets by department" description="Open and resolved, busiest departments first" icon={<ChartColumn />}>
              <TicketsByDepartmentChart tickets={tickets} />
            </Panel>
          </div>
        </TabPanel>
      </PageStack>

      <PortalRoomDetail
        p={p}
        tickets={ticketMutations}
        ticketActions={ticketActions}
        controls={
          p.selectedRoom && (
            <div className="flex flex-col gap-4">
              <StayControl room={p.selectedRoom} pending={isPending} onChange={setStayState} />
              <HousekeepingControl room={p.selectedRoom} pending={isPending} onCycle={cycleCleaning} />
            </div>
          )
        }
      />

      <Fab label="Dispatch ticket" onClick={() => setDispatchOpen(true)} />

      <ResponsiveSheet open={dispatchOpen} onOpenChange={setDispatchOpen} title="Dispatch ticket" description="Log and route a guest request now.">
        <NewTicketForm withRoom onSubmit={quickDispatch} pending={isPending} />
      </ResponsiveSheet>

      <ResponsiveSheet open={backfillOpen} onOpenChange={setBackfillOpen} title="Backfill past incident" description="Add an older ticket to a room's history with its real date.">
        <PastIncidentForm withRoom onSubmit={backfill} pending={isPending} />
      </ResponsiveSheet>
    </AppShell>
  );
}

export default withNotices(ReceptionPortalView);
