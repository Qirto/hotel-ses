"use client";

import { useCallback, useMemo, useState } from "react";
import { BedDouble, ChartColumn, ClipboardList, ConciergeBell, History, Hotel, LayoutDashboard, Send, Sparkles, TriangleAlert } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Resident, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { Fab } from "@/components/app/Fab";
import { NoticeProvider } from "@/components/app/notice";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { TabPanel } from "@/components/app/TabPanel";
import { Button } from "@/components/ui/button";
import { Panel, PageStack } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { RoomDetail } from "@/components/features/RoomDetail";
import { NewTicketForm, PastIncidentForm, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { useTicketActions } from "@/components/features/TicketActions";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { UrgentTicketsPanel } from "@/components/features/views/UrgentTicketsPanel";
import { RoomStatusChart } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { StayControl } from "@/components/features/room/StayControl";
import { RoomLogForms } from "@/components/features/room/RoomLogForms";
import { usePortalState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { countOpenTickets, countRoomsNeedingAttention, isUrgentOpenTicket } from "@/lib/tickets";
import { roomStatusCounts, STAY_MESSAGE, STAY_RESULT, type RoomFilter, type StayState } from "@/lib/rooms";
import { plural } from "@/lib/format";
import { acknowledgeReclamation, createHistoricalReclamation, createRapidReclamation, resolveReclamation, updateRoomStayState } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents?: Resident[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  staffList?: Staff[];
  isLiveSupabase?: boolean;
}

type Tab = "OVERVIEW" | "ROOMS" | "RECLAMATIONS" | "STATS";

const NO_DEPARTMENTS: Department[] = [];
const NO_TICKETS: Reclamation[] = [];

export default function ReceptionPortal(props: Props) {
  return (
    <NoticeProvider>
      <ReceptionPortalView {...props} />
    </NoticeProvider>
  );
}

function ReceptionPortalView({ rooms, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "OVERVIEW", rooms, reclamations: reclamationsList });
  const { activeTab, go, tickets, setTickets, liveRooms, patchRoom, isPending, run, runForResult, flash, selectedRoom, openRoom } = p;

  useRealtimeRefresh("realtime-reception", ["reclamations", "rooms"], isLiveSupabase);

  /* ───────────── derived data ───────────── */
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const counts = useMemo(() => roomStatusCounts(liveRooms), [liveRooms]);
  const occupancyPct = liveRooms.length ? `${Math.round((counts.occupied / liveRooms.length) * 100)}%` : "–";
  const urgentOpen = useMemo(() => tickets.filter(isUrgentOpenTicket), [tickets]);
  const departmentCodes = useMemo(() => departmentsList.map((d) => d.code), [departmentsList]);

  /* ───────────── ticket actions (optimistic, reverted on failure) ───────────── */
  const updateTicket = useCallback(
    (id: number, patch: Partial<Reclamation>, action: () => Promise<{ success: boolean }>, ok: string, fail: string) => {
      let previous: Reclamation | undefined;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          previous = t;
          return { ...t, ...patch };
        })
      );
      run(async () => {
        const res = await action();
        if (res.success) flash("success", ok);
        else {
          if (previous) setTickets((prev) => prev.map((t) => (t.id === id ? previous! : t)));
          flash("danger", fail);
        }
      });
    },
    [setTickets, run, flash]
  );

  const acknowledgeTicket = useCallback(
    (id: number) => updateTicket(id, { status: "IN_PROGRESS" }, () => acknowledgeReclamation(id), "Ticket marked in progress.", "Could not update the ticket."),
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
  const ticketActions = useTicketActions({ pending: isPending, onAcknowledge: acknowledgeTicket, onResolve: resolveTicket });

  /* ───────────── room actions ───────────── */
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

  /** Room-scoped dispatch, shared by the room detail and the quick-dispatch sheet. */
  const dispatchTicket = useCallback(
    (room: HotelRoom, input: NewTicketInput, fallback: string) =>
      runForResult(async () => {
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
        return Boolean(res.success);
      }),
    [runForResult, setTickets, flash]
  );

  const recordPastIncident = useCallback(
    (room: HotelRoom, input: PastIncidentInput, fallback: string) =>
      runForResult(async () => {
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
        return Boolean(res.success);
      }),
    [runForResult, setTickets, flash]
  );

  const createInRoom = useCallback(
    async (input: NewTicketInput) => (selectedRoom ? dispatchTicket(selectedRoom, input, `${input.category} issue logged via Room Modal`) : false),
    [selectedRoom, dispatchTicket]
  );
  const recordInRoom = useCallback(
    async (input: PastIncidentInput) =>
      selectedRoom ? recordPastIncident(selectedRoom, input, `Historical log for Room ${selectedRoom.room_number}`) : false,
    [selectedRoom, recordPastIncident]
  );

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
      { id: "OVERVIEW", label: "Overview", icon: <LayoutDashboard aria-hidden />, isActive: activeTab === "OVERVIEW", onClick: () => go("OVERVIEW") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "STATS", label: "Stats", icon: <ChartColumn aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
    ],
    [activeTab, attentionCount, openCount, go]
  );

  return (
    <AppShell role="reception" items={navItems} departmentName="Reception Operations" departmentCode="Reception">
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
            <Kpi label="Occupied" value={counts.occupied} hint={`${occupancyPct} of ${plural(liveRooms.length, "room")}`} icon={<Hotel />} onClick={() => showRooms("OCCUPIED")} />
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
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={roomFilter} onFilterChange={setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} actions={ticketActions} departments={departmentCodes} />
        </TabPanel>

        <TabPanel active={activeTab === "STATS"}>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <Panel title="Room status" description="Where all rooms stand right now" icon={<BedDouble />}>
              <RoomStatusChart rooms={liveRooms} />
            </Panel>
            <Panel title="Tickets by department" description="Open and resolved, busiest departments first" icon={<ChartColumn />}>
              <TicketsByDepartmentChart tickets={tickets} />
            </Panel>
          </div>
        </TabPanel>
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={p.closeRoom}
        ticketActions={ticketActions}
        controls={
          selectedRoom && (
            <div className="flex flex-col gap-4">
              <StayControl room={selectedRoom} pending={isPending} onChange={setStayState} />
              <HousekeepingControl room={selectedRoom} pending={isPending} onCycle={cycleCleaning} />
            </div>
          )
        }
        logForm={<RoomLogForms mode={p.logMode} onModeChange={p.setLogMode} onCreate={createInRoom} onRecordPast={recordInRoom} pending={isPending} />}
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
