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
import { ConfirmSheet } from "@/components/features/ConfirmSheet";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { DirectoryView } from "@/components/features/hr/DirectoryView";
import { initialRoster, ShiftsView, type Roster } from "@/components/features/hr/Roster";
import { AddStaffSheet } from "@/components/features/hr/AddStaffSheet";
import { DEFAULT_HOTEL_DEPARTMENTS, headcountByDepartment, type NewStaffInput } from "@/components/features/hr/staff";
import { usePortalState, useSyncedState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { departmentLabel, percent, plural } from "@/lib/format";
import type { ShiftType } from "@/lib/constants";
import { createStaffMember, deleteStaffMember, markStaffAbsentAndRedistribute, toggleStaffShift } from "@/app/actions";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

type Tab = "EMPLOYEES" | "ROOMS" | "RECLAMATIONS" | "STATS";
type SubTab = "DIRECTORY" | "SHIFTS";
type Pending = { kind: "absent" | "delete"; member: Staff } | null;

const NO_DEPARTMENTS: Department[] = [];
const NO_TICKETS: Reclamation[] = [];
const NO_ROOMS: HotelRoom[] = [];

const HEADCOUNT_SERIES: Series[] = [
  { key: "onShift", label: "On shift", color: "var(--success)" },
  { key: "offShift", label: "Off shift", color: "var(--text-muted)" },
];

function HrPortalView({ staffList, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, rooms = NO_ROOMS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "EMPLOYEES", rooms, reclamations: reclamationsList });
  const { activeTab, tickets, liveRooms, isPending, run, runForResult, flash, openRoom, openCount, attentionCount } = p;
  const [subTab, setSubTab] = useState<SubTab>("DIRECTORY");
  const [staff, setStaff] = useSyncedState<Staff[]>(staffList);

  useRealtimeRefresh("realtime-hr", ["staff", "departments", "reclamations"], isLiveSupabase);

  /* ───────────── departments ───────────── */
  const activeDepartments = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    DEFAULT_HOTEL_DEPARTMENTS.forEach((d) => map.set(d.code, { code: d.code, name: d.name }));
    departmentsList.forEach((d) => map.set(d.code, { code: d.code, name: d.name }));
    return [...map.values()];
  }, [departmentsList]);
  const deptName = useCallback(
    (code?: string | null) => activeDepartments.find((d) => d.code === code)?.name ?? departmentLabel(code),
    [activeDepartments]
  );
  const deptCodes = useMemo(() => activeDepartments.map((d) => d.code), [activeDepartments]);
  const deptOptions = useMemo(() => activeDepartments.map((d) => ({ value: d.code, label: d.name })), [activeDepartments]);
  const deptFilterOptions = useMemo(() => [{ value: "ALL", label: "All departments" }, ...deptOptions], [deptOptions]);

  /* ───────────── directory ───────────── */
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) return false;
      return !q || s.full_name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
    });
  }, [staff, selectedDept, search]);
  const onShiftCount = useMemo(() => staff.filter((s) => s.shift_status === "ON_SHIFT").length, [staff]);

  const toggleShift = useCallback(
    (member: Staff) =>
      run(async () => {
        const res = await toggleStaffShift(member.id, member.shift_status);
        if (res.success) {
          const next = member.shift_status === "ON_SHIFT" ? "OFF_SHIFT" : "ON_SHIFT";
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: next, is_present: next === "ON_SHIFT" } : s)));
          flash("success", `${member.full_name} is now ${next === "ON_SHIFT" ? "on shift" : "off shift"}.`);
        } else flash("danger", `Could not update the shift for ${member.full_name}.`);
      }),
    [run, setStaff, flash]
  );

  const [pending, setPending] = useState<Pending>(null);
  const askAbsent = useCallback((member: Staff) => setPending({ kind: "absent", member }), []);
  const askRemove = useCallback((member: Staff) => setPending({ kind: "delete", member }), []);
  const cancelPending = useCallback(() => setPending(null), []);

  const confirmPending = () => {
    if (!pending) return;
    const { kind, member } = pending;
    run(async () => {
      if (kind === "absent") {
        const res = await markStaffAbsentAndRedistribute(member.id);
        if (res.success) {
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: "OFF_SHIFT", is_present: false } : s)));
          flash("success", `${member.full_name} marked absent. Open tickets were reassigned.`);
        } else flash("danger", `Could not mark ${member.full_name} absent.`);
      } else {
        const res = await deleteStaffMember(member.id);
        if (res.success) {
          setStaff((prev) => prev.filter((s) => s.id !== member.id));
          flash("success", `${member.full_name} was removed from the directory.`);
        } else flash("danger", `Could not remove ${member.full_name}.`);
      }
      setPending(null);
    });
  };

  /* ───────────── add staff ───────────── */
  const [showCreate, setShowCreate] = useState(false);
  const openCreate = useCallback(() => setShowCreate(true), []);
  const createStaff = (input: NewStaffInput) =>
    runForResult(async () => {
      const res = await createStaffMember({ ...input, shift_status: "ON_SHIFT" });
      if (res.success) {
        setShowCreate(false);
        flash("success", `${input.full_name} was added to the directory.`);
      } else flash("danger", res.error || "Could not add the employee.");
      return Boolean(res.success);
    });

  /* ───────────── shifts roster (client-side only) ───────────── */
  const [roster, setRoster] = useState<Roster>(() => initialRoster(staffList));
  const setShift = useCallback((staffId: number, day: string, shift: ShiftType) => {
    setRoster((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [day]: shift } }));
  }, []);

  /* ───────────── rooms + tickets ───────────── */
  const ticketMutations = useTicketMutations(p, "HR");
  const cycleCleaning = useCleaningCycle(p);

  /* ───────────── analytics ───────────── */
  const headcount = useMemo(() => headcountByDepartment(staff, deptName), [staff, deptName]);
  const largest = headcount[0];

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      navItem(p, "EMPLOYEES", "Staff & Shifts", <Users aria-hidden />, { badge: staff.length, badgeTone: "neutral" }),
      ...sharedNavItems(p),
      navItem(p, "STATS", "Analytics", <ChartColumn aria-hidden />),
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
              { id: "DIRECTORY", label: "Directory", icon: <Users className="size-4" aria-hidden />, badge: filteredStaff.length },
              { id: "SHIFTS", label: "Shifts", icon: <CalendarDays className="size-4" aria-hidden /> },
            ]}
            activeTab={subTab}
            onChange={(id) => setSubTab(id as SubTab)}
            renderContent={false}
            tabsContainerClassName="no-scrollbar max-w-full overflow-x-auto"
          />

          <TabPanel active={subTab === "DIRECTORY"}>
            <DirectoryView
              staff={staff}
              rows={filteredStaff}
              onShiftCount={onShiftCount}
              departmentCount={activeDepartments.length}
              search={search}
              onSearchChange={setSearch}
              department={selectedDept}
              onDepartmentChange={setSelectedDept}
              departmentOptions={deptFilterOptions}
              departmentName={deptName}
              pending={isPending}
              onToggleShift={toggleShift}
              onMarkAbsent={askAbsent}
              onRemove={askRemove}
              onAdd={openCreate}
            />
          </TabPanel>

          <TabPanel active={subTab === "SHIFTS"}>
            <ShiftsView staff={staff} roster={roster} onShiftChange={setShift} departmentOptions={deptFilterOptions} />
          </TabPanel>
        </TabPanel>

        <TabPanel active={activeTab === "ROOMS"}>
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={p.roomFilter} onFilterChange={p.setRoomFilter} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} departments={deptCodes} departmentName={deptName} />
        </TabPanel>

        <TabPanel active={activeTab === "STATS"}>
          <KpiGrid>
            <Kpi label="Total staff" value={staff.length} icon={<Users />} />
            <Kpi label="On shift" value={onShiftCount} hint={`${percent(onShiftCount, staff.length)} of staff`} tone="success" icon={<UserCheck />} />
            <Kpi label="Staffed departments" value={headcount.length} hint={`of ${plural(activeDepartments.length, "department")}`} icon={<Building2 />} />
            <Kpi label="Largest department" value={largest ? largest.label : "–"} hint={largest ? plural(largest.values.onShift + largest.values.offShift, "employee") : "No staff yet"} icon={<ChartColumn />} />
          </KpiGrid>
          <Panel title="Headcount per department" description="Employees on and off shift" icon={<ChartColumn />}>
            {headcount.length > 0 ? (
              <RankedBreakdown rows={headcount} series={HEADCOUNT_SERIES} label="Staff headcount per department" unit={["employee", "employees"]} />
            ) : (
              <EmptyState icon={<Users />} title="No staff yet" description="Headcount appears once employees are added." />
            )}
          </Panel>
        </TabPanel>
      </PageStack>

      <PortalRoomDetail
        p={p}
        tickets={ticketMutations}
        controls={p.selectedRoom && <HousekeepingControl room={p.selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
      />

      <AddStaffSheet open={showCreate} onOpenChange={setShowCreate} departments={deptOptions} pending={isPending} onSubmit={createStaff} />

      <ConfirmSheet
        open={pending !== null}
        title={pending?.kind === "delete" ? "Remove employee" : "Mark absent"}
        description={
          pending?.kind === "delete"
            ? `Remove ${pending.member.full_name} from the staff directory? Their tickets become unassigned. This can't be undone.`
            : `Mark ${pending?.member.full_name ?? "this employee"} absent today and reassign their open tickets?`
        }
        confirmLabel={pending?.kind === "delete" ? "Remove" : "Mark absent"}
        pendingLabel={pending?.kind === "delete" ? "Removing" : "Updating"}
        tone={pending?.kind === "delete" ? "danger" : "primary"}
        pending={isPending}
        onConfirm={confirmPending}
        onCancel={cancelPending}
      />
    </AppShell>
  );
}

export default withNotices(HrPortalView);
