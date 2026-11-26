"use client";

import { useCallback, useMemo, useState } from "react";
import { Building2, CalendarDays, ChartColumn, UserCheck, Users } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import { navItem, sharedNavItems, type NavTabItem } from "@/components/app/nav";
import { withNotices } from "@/components/app/notice";
import { TabPanel } from "@/components/app/TabPanel";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { RankedBreakdown, type Series } from "@/components/features/charts/Breakdown";
import { Panel, PageStack, EmptyState } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { PortalRoomDetail } from "@/components/features/PortalRoomDetail";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { initialRoster, ShiftsView, type Roster } from "@/components/features/hr/Roster";
import { ServicesPanel, StaffDirectoryPanel } from "@/components/features/hr/panels";
import { headcountByDepartment } from "@/components/features/hr/staff";
import { usePortalState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useConfirm } from "@/hooks/useConfirm";
import { useDepartmentsCrud } from "@/hooks/useDepartmentsCrud";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { percent, plural } from "@/lib/format";
import type { ShiftType } from "@/lib/constants";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

type Tab = "EMPLOYEES" | "ROOMS" | "RECLAMATIONS" | "STATS";
type SubTab = "DIRECTORY" | "SHIFTS" | "DEPARTMENTS";

const NO_DEPARTMENTS: Department[] = [];
const NO_TICKETS: Reclamation[] = [];
const NO_ROOMS: HotelRoom[] = [];

const HEADCOUNT_SERIES: Series[] = [
  { key: "onShift", label: "En service", color: "var(--success)" },
  { key: "offShift", label: "Hors service", color: "var(--text-muted)" },
];

/** RH portal: staff (directory, shifts, services), rooms, requests and headcount. */
function HrPortalView({ staffList, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, rooms = NO_ROOMS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "EMPLOYEES", rooms, reclamations: reclamationsList });
  const { activeTab, tickets, liveRooms, isPending, openRoom, openCount, attentionCount } = p;
  const [subTab, setSubTab] = useState<SubTab>("DIRECTORY");

  useRealtimeRefresh("realtime-hr", ["staff", "departments", "reclamations"], isLiveSupabase);

  /* ───────────── shared features (same code as the Administration portal) ───────────── */
  const confirm = useConfirm(p);
  const services = useDepartmentsCrud(p, departmentsList, confirm.ask);
  const people = useStaffDirectory(p, staffList, confirm.ask, services.options);
  const { staff, onShiftCount } = people;

  /* ───────────── shifts roster (client-side only) ───────────── */
  const [roster, setRoster] = useState<Roster>(() => initialRoster(staffList));
  const setShift = useCallback((staffId: number, day: string, shift: ShiftType) => {
    setRoster((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [day]: shift } }));
  }, []);

  /* ───────────── rooms + tickets ───────────── */
  const ticketMutations = useTicketMutations(p, "RH");
  const cycleCleaning = useCleaningCycle(p);

  /* ───────────── analytics ───────────── */
  const headcount = useMemo(() => headcountByDepartment(staff, services.name), [staff, services.name]);
  const largest = headcount[0];

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      navItem(p, "EMPLOYEES", "Personnel & horaires", <Users aria-hidden />, { badge: staff.length, badgeTone: "neutral", shortLabel: "Personnel" }),
      ...sharedNavItems(p),
      navItem(p, "STATS", "Analyses", <ChartColumn aria-hidden />),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, staff.length, attentionCount, openCount, p.go]
  );

  return (
    <AppShell role="rh" items={navItems}>
      <PageStack>
        <TabPanel active={activeTab === "EMPLOYEES"}>
          <AnimatedTabs
            tabs={[
              { id: "DIRECTORY", label: "Annuaire", icon: <Users className="size-4" aria-hidden />, badge: people.rows.length },
              { id: "SHIFTS", label: "Horaires", icon: <CalendarDays className="size-4" aria-hidden /> },
              { id: "DEPARTMENTS", label: "Services", icon: <Building2 className="size-4" aria-hidden />, badge: services.departments.length },
            ]}
            activeTab={subTab}
            onChange={(id) => setSubTab(id as SubTab)}
            renderContent={false}
            tabsContainerClassName="no-scrollbar max-w-full overflow-x-auto"
          />

          <TabPanel active={subTab === "DIRECTORY"}>
            <StaffDirectoryPanel people={people} services={services} pending={isPending} />
          </TabPanel>

          <TabPanel active={subTab === "SHIFTS"}>
            <ShiftsView staff={staff} roster={roster} onShiftChange={setShift} departmentOptions={services.filterOptions} />
          </TabPanel>

          <TabPanel active={subTab === "DEPARTMENTS"}>
            <ServicesPanel services={services} staff={staff} pending={isPending} />
          </TabPanel>
        </TabPanel>

        <TabPanel active={activeTab === "ROOMS"}>
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={p.roomFilter} onFilterChange={p.setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} departments={services.codes} departmentName={services.name} />
        </TabPanel>

        <TabPanel active={activeTab === "STATS"}>
          <KpiGrid>
            <Kpi label="Effectif total" value={staff.length} icon={<Users />} />
            <Kpi label="En service" value={onShiftCount} hint={`${percent(onShiftCount, staff.length)} du personnel`} tone="success" icon={<UserCheck />} />
            <Kpi label="Services pourvus" value={headcount.length} hint={`sur ${plural(services.active.length, "service")}`} icon={<Building2 />} />
            <Kpi label="Service le plus important" value={largest ? largest.label : "–"} hint={largest ? plural(largest.values.onShift + largest.values.offShift, "employé") : "Aucun employé pour l’instant"} icon={<ChartColumn />} />
          </KpiGrid>
          <Panel title="Effectif par service" description="Employés en service et hors service" icon={<ChartColumn />}>
            {headcount.length > 0 ? (
              <RankedBreakdown rows={headcount} series={HEADCOUNT_SERIES} label="Effectif du personnel par service" unit={["employé", "employés"]} />
            ) : (
              <EmptyState icon={<Users />} title="Aucun employé pour l’instant" description="L’effectif s’affichera dès que des employés auront été ajoutés." />
            )}
          </Panel>
        </TabPanel>
      </PageStack>

      <PortalRoomDetail
        p={p}
        tickets={ticketMutations}
        controls={p.selectedRoom && <HousekeepingControl room={p.selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
      />

      {people.formElement}
      {services.formElement}
      {confirm.element}
    </AppShell>
  );
}

export default withNotices(HrPortalView);
