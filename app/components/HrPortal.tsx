"use client";

import { useCallback, useMemo, useState } from "react";
import { BedDouble, Building2, CalendarDays, ChartColumn, ClipboardList, UserCheck, Users } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { NoticeProvider } from "@/components/app/notice";
import { TabPanel } from "@/components/app/TabPanel";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { BarChart } from "@/components/ui/bar-chart";
import { Panel, PageStack, EmptyState } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { RoomDetail } from "@/components/features/RoomDetail";
import type { NewTicketInput, PastIncidentInput } from "@/components/features/Forms";
import { ConfirmSheet } from "@/components/features/ConfirmSheet";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { RoomLogForms } from "@/components/features/room/RoomLogForms";
import { DirectoryView } from "@/components/features/hr/DirectoryView";
import { initialRoster, ShiftsView, type Roster } from "@/components/features/hr/Roster";
import { AddStaffSheet } from "@/components/features/hr/AddStaffSheet";
import { DEFAULT_HOTEL_DEPARTMENTS, type NewStaffInput } from "@/components/features/hr/staff";
import { usePortalState, useSyncedState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { countOpenTickets, countRoomsNeedingAttention } from "@/lib/tickets";
import { departmentLabel, plural } from "@/lib/format";
import type { ShiftType } from "@/lib/constants";
import { createHistoricalReclamation, createRapidReclamation, createStaffMember } from "@/app/actions";
import { deleteStaffMember, markStaffAbsentAndRedistribute, toggleStaffShift } from "@/app/actions";

export { DEFAULT_HOTEL_DEPARTMENTS, STANDARD_ROLES } from "@/components/features/hr/staff";

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

const HEADCOUNT_SERIES = [
  { key: "onShift", label: "On shift", color: "var(--success)" },
  { key: "offShift", label: "Off shift", color: "var(--info)" },
];

export default function HrPortal(props: Props) {
  return (
    <NoticeProvider>
      <HrPortalView {...props} />
    </NoticeProvider>
  );
}

function HrPortalView({ staffList, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, rooms = NO_ROOMS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "EMPLOYEES", rooms, reclamations: reclamationsList });
  const { activeTab, go, tickets, setTickets, liveRooms, isPending, run, runForResult, flash, selectedRoom, openRoom } = p;
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
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const cycleCleaning = useCleaningCycle(p);

  const createTicket = useCallback(
    async (input: NewTicketInput) => {
      if (!selectedRoom) return false;
      return runForResult(async () => {
        const res = await createRapidReclamation({
          roomId: selectedRoom.id,
          department: input.department,
          category: input.category,
          priority: input.priority,
          description: input.description || `HR ticket for room ${selectedRoom.room_number}`,
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
          description: input.description || `Historical log for room ${selectedRoom.room_number}`,
          status: input.status,
          createdAt: input.createdAt,
          isConfidential: false,
        });
        if (res.success && res.data) setTickets((prev) => [res.data as Reclamation, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Past incident recorded for room ${selectedRoom.room_number}.` : res.error || "Could not record the incident.");
        return Boolean(res.success);
      });
    },
    [selectedRoom, runForResult, setTickets, flash]
  );

  /* ───────────── analytics ───────────── */
  const headcount = useMemo(() => {
    const counts = new Map<string, { on: number; off: number }>();
    for (const s of staff) {
      const dept = s.department || "RECEPTION";
      const c = counts.get(dept) ?? { on: 0, off: 0 };
      if (s.shift_status === "ON_SHIFT") c.on++;
      else c.off++;
      counts.set(dept, c);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].on + b[1].off - (a[1].on + a[1].off))
      .map(([dept, c]) => ({ label: departmentLabel(dept), onShift: c.on, offShift: c.off }));
  }, [staff]);
  const largest = headcount[0];

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      { id: "EMPLOYEES", label: "Staff & Shifts", icon: <Users aria-hidden />, badge: staff.length, badgeTone: "neutral", isActive: activeTab === "EMPLOYEES", onClick: () => go("EMPLOYEES") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "STATS", label: "Analytics", icon: <ChartColumn aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
    ],
    [activeTab, staff.length, attentionCount, openCount, go]
  );

  return (
    <AppShell items={navItems} departmentName="Human Resources & Roster" departmentCode="HR" tone="success">
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
          <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} />
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} departments={deptCodes} departmentName={deptName} />
        </TabPanel>

        <TabPanel active={activeTab === "STATS"}>
          <KpiGrid>
            <Kpi label="Total staff" value={staff.length} icon={<Users />} />
            <Kpi label="On shift" value={onShiftCount} hint={staff.length ? `${Math.round((onShiftCount / staff.length) * 100)}% of staff` : "–"} tone="success" icon={<UserCheck />} />
            <Kpi label="Staffed departments" value={headcount.length} hint={`of ${activeDepartments.length} departments`} icon={<Building2 />} />
            <Kpi label="Largest department" value={largest ? largest.label : "–"} hint={largest ? plural(largest.onShift + largest.offShift, "employee") : "No staff yet"} icon={<ChartColumn />} />
          </KpiGrid>
          <Panel title="Headcount per department" description="Employees on and off shift" icon={<ChartColumn />}>
            {headcount.length > 0 ? (
              <BarChart data={headcount} series={HEADCOUNT_SERIES} variant="stacked" height={260} ariaLabel="Staff headcount per department" />
            ) : (
              <EmptyState icon={<Users />} title="No staff yet" description="Headcount appears once employees are added." />
            )}
          </Panel>
        </TabPanel>
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={p.closeRoom}
        controls={selectedRoom && <HousekeepingControl room={selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
        logForm={
          <RoomLogForms
            mode={p.logMode}
            onModeChange={p.setLogMode}
            onCreate={createTicket}
            onRecordPast={recordPast}
            pending={isPending}
            submitLabel="Create ticket"
          />
        }
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
