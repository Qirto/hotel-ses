"use client";

import { memo, useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { BedDouble, Building2, CalendarDays, ChartColumn, ClipboardList, Layers, ListFilter, Phone, Power, Trash2 } from "lucide-react";
import { UserCheck, UserMinus, UserPlus, UserRound, Users, UserX } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/components/app/AppShell";
import type { NavTabItem } from "@/components/app/nav";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { BarChart } from "@/components/ui/bar-chart";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Panel, PageStack, EmptyState } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, PillGroup, SearchInput, SelectField } from "@/components/features/Filters";
import { RoomGrid } from "@/components/features/RoomGrid";
import { TicketTable } from "@/components/features/TicketTable";
import { RoomDetail } from "@/components/features/RoomDetail";
import { Field, NewTicketForm, Notice, PastIncidentForm, Segmented, Select, TextInput, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { ToneBadge } from "@/components/features/StatusBadges";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { MD_UP, useMediaQuery } from "@/hooks/useMediaQuery";
import { countOpenTickets, countRoomsNeedingAttention } from "@/lib/tickets";
import { CLEANING_LABEL, ticketStatsByRoom } from "@/lib/rooms";
import { departmentLabel, plural } from "@/lib/format";
import { departmentIcon, SHIFT_ICONS } from "@/lib/icons";
import { SHIFT_LABELS, type ShiftType } from "@/lib/constants";
import { createHistoricalReclamation, createRapidReclamation, createStaffMember, cycleRoomCleaning } from "@/app/actions";
import { deleteStaffMember, markStaffAbsentAndRedistribute, toggleStaffShift } from "@/app/actions";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

/** Built-in departments. Icons are rendered with `departmentIcon(code)`, never stored here. */
export const DEFAULT_HOTEL_DEPARTMENTS: Omit<Department, "icon">[] = [
  { id: 1, code: "RECEPTION", name: "Reception & Front Desk", description: "Guest check-in/out, switchboard, inquiries and concierge dispatches", head_of_department: "Sophie Mercier" },
  { id: 2, code: "HOUSEKEEPING", name: "Housekeeping & Gouvernante", description: "Room cleaning, linen management, amenity restocking and floor inspections", head_of_department: "Martine Aubry" },
  { id: 3, code: "TECHNICAL", name: "Technical & Maintenance", description: "Plumbing, electrical, HVAC, fixtures and preventive facilities maintenance", head_of_department: "Pierre Dubois" },
  { id: 4, code: "FOOD_AND_BEVERAGE", name: "Food & Beverage (F&B)", description: "Kitchen, restaurants, banquets, room service and bars", head_of_department: "Chef Antoine Girard" },
  { id: 5, code: "MANAGEMENT", name: "Executive & General Management", description: "Hotel operations oversight, executive decisions, VIP relations and strategy", head_of_department: "Jean-Paul Bonnet" },
  { id: 6, code: "SECURITY", name: "Security & Safety", description: "Premises surveillance, access control, keycards, guest safety and emergency protocols", head_of_department: "Marc Lambert" },
  { id: 7, code: "CONCIERGE", name: "Concierge & Guest Relations", description: "Valet parking, luggage handling, excursions, transport and VIP guest assistance", head_of_department: "Lucie Moreau" },
  { id: 8, code: "SPA_AND_WELLNESS", name: "Spa, Wellness & Fitness", description: "Massage treatments, thermal baths, sauna, gym and wellness therapies", head_of_department: "Camille Roux" },
  { id: 9, code: "SALES_AND_MARKETING", name: "Sales, Marketing & Events", description: "Group bookings, corporate events, weddings, digital marketing and PR", head_of_department: "Helene Fontaine" },
  { id: 10, code: "FINANCE_AND_ACCOUNTING", name: "Finance, Accounting & Audit", description: "Night audit, billing, purchasing, payroll and revenue management", head_of_department: "Bernard Leroy" },
  { id: 11, code: "HUMAN_RESOURCES", name: "Human Resources (HR)", description: "Recruitment, employee onboarding, scheduling, payroll and training", head_of_department: "Claire Delacroix" },
];

export const STANDARD_ROLES = [
  "manager", "receptionist", "maintenance", "governance", "chef", "cook", "waiter", "bartender",
  "concierge", "security_officer", "spa_therapist", "housekeeper", "bellboy", "accountant", "hr_specialist", "master",
];

type Tab = "EMPLOYEES" | "ROOMS" | "RECLAMATIONS" | "STATS";
type SubTab = "DIRECTORY" | "SHIFTS";
type DateRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE";
type RoomFilter = "ALL" | "ATTENTION" | "OCCUPIED" | "VACANT_CLEAN" | "DIRTY";
type Roster = Record<number, Record<string, ShiftType>>;
type Pending = { kind: "absent" | "delete"; member: Staff } | null;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFT_TYPES: ShiftType[] = ["MORNING", "EVENING", "NIGHT", "OFF"];
const SHIFT_OPTIONS = SHIFT_TYPES.map((s) => ({ value: s, label: SHIFT_LABELS[s].label }));
const ROLE_OPTIONS = STANDARD_ROLES.map((r) => ({ value: r, label: roleLabel(r) }));
const DAY_MS = 864e5;

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
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const SHIFT_STATUS: Record<Staff["shift_status"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  ON_SHIFT: { label: "On shift", tone: "success" },
  OFF_SHIFT: { label: "Off shift", tone: "neutral" },
  ON_BREAK: { label: "On break", tone: "warning" },
};

function roleLabel(role: string) {
  const s = role.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Same seeded weekly pattern as before (client-side only, not persisted). */
function initialRoster(staff: readonly Staff[]): Roster {
  const roster: Roster = {};
  staff.forEach((s, index) => {
    roster[s.id] = {};
    WEEKDAYS.forEach((day, d) => {
      if ((index + d) % 7 === 0 || (index + d) % 7 === 6) roster[s.id][day] = "OFF";
      else if (s.role === "receptionist" || s.role === "housekeeper") roster[s.id][day] = d % 2 === 0 ? "MORNING" : "EVENING";
      else if (s.role === "security_officer" || s.role === "maintenance") roster[s.id][day] = d % 3 === 0 ? "NIGHT" : "MORNING";
      else roster[s.id][day] = "MORNING";
    });
  });
  return roster;
}

export default function HrPortal({ staffList, departmentsList = [], reclamationsList = [], rooms = [], isLiveSupabase = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("EMPLOYEES");
  const [subTab, setSubTab] = useState<SubTab>("DIRECTORY");
  const [, startTabTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const isDesktop = useMediaQuery(MD_UP);

  // Local copies so optimistic updates show instantly; server refreshes replace them.
  const [tickets, setTickets] = useState<Reclamation[]>(reclamationsList);
  useEffect(() => setTickets(reclamationsList), [reclamationsList]);
  const [staff, setStaff] = useState<Staff[]>(staffList);
  useEffect(() => setStaff(staffList), [staffList]);
  const [roomOverrides, setRoomOverrides] = useState<Record<number, Partial<HotelRoom>>>({});
  useEffect(() => setRoomOverrides({}), [rooms]);
  const liveRooms = useMemo(
    () => (Object.keys(roomOverrides).length ? rooms.map((r) => (roomOverrides[r.id] ? { ...r, ...roomOverrides[r.id] } : r)) : rooms),
    [rooms, roomOverrides]
  );

  useRealtimeRefresh("realtime-hr", ["staff", "departments", "reclamations"], isLiveSupabase);

  const flash = useCallback((tone: "success" | "danger", text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

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
  const deptOptions = useMemo(() => activeDepartments.map((d) => ({ value: d.code, label: d.name })), [activeDepartments]);

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

  const [pending, setPending] = useState<Pending>(null);

  const toggleShift = useCallback(
    (member: Staff) =>
      startTransition(async () => {
        const res = await toggleStaffShift(member.id, member.shift_status);
        if (res.success) {
          const next = member.shift_status === "ON_SHIFT" ? "OFF_SHIFT" : "ON_SHIFT";
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: next, is_present: next === "ON_SHIFT" } : s)));
          flash("success", `${member.full_name} is now ${next === "ON_SHIFT" ? "on shift" : "off shift"}.`);
        } else flash("danger", `Could not update the shift for ${member.full_name}.`);
      }),
    [flash]
  );

  const confirmPending = () => {
    if (!pending) return;
    const { kind, member } = pending;
    startTransition(async () => {
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

  const staffColumns = useMemo<DataTableColumn<Staff>[]>(
    () => [
      {
        key: "full_name",
        header: "Employee",
        primary: true,
        width: "minmax(0, 1.6fr)",
        cell: (s) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-hover text-fg-muted">
              <UserRound className="size-4" aria-hidden />
            </span>
            <span className="truncate font-medium text-fg">{s.full_name}</span>
          </span>
        ),
      },
      { key: "role", header: "Role", width: "minmax(0, 1fr)", accessor: (s) => roleLabel(s.role), cell: (s) => <span className="truncate text-fg-secondary">{roleLabel(s.role)}</span> },
      {
        key: "department",
        header: "Department",
        width: "minmax(0, 1.3fr)",
        accessor: (s) => deptName(s.department || "RECEPTION"),
        cell: (s) => {
          const Icon = departmentIcon(s.department || "RECEPTION");
          return (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-fg-secondary">
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="truncate">{deptName(s.department || "RECEPTION")}</span>
            </span>
          );
        },
      },
      {
        key: "phone_number",
        header: "Phone",
        width: "minmax(0, 1fr)",
        hideOnMobile: true,
        accessor: (s) => s.phone_number ?? "",
        cell: (s) => <span className="truncate tabular-nums text-fg-secondary">{s.phone_number || "–"}</span>,
      },
      {
        key: "shift_status",
        header: "Shift",
        width: "minmax(6.5rem, 0.8fr)",
        accessor: (s) => SHIFT_STATUS[s.shift_status]?.label ?? s.shift_status,
        cell: (s) => {
          const st = SHIFT_STATUS[s.shift_status] ?? { label: s.shift_status, tone: "neutral" as const };
          return <ToneBadge tone={st.tone}>{st.label}</ToneBadge>;
        },
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        width: "minmax(19rem, auto)",
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (s) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => toggleShift(s)} disabled={isPending} leftIcon={<Power className="size-4" aria-hidden />}>
              {s.shift_status === "ON_SHIFT" ? "End shift" : "Start shift"}
            </Button>
            <Button variant="outline" onClick={() => setPending({ kind: "absent", member: s })} disabled={isPending} leftIcon={<UserMinus className="size-4" aria-hidden />}>
              Absent
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPending({ kind: "delete", member: s })} disabled={isPending} aria-label={`Remove ${s.full_name}`}>
              <Trash2 className="size-4 text-danger" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [deptName, toggleShift, isPending]
  );

  /* ───────────── shifts roster (client-side only) ───────────── */
  const [roster, setRoster] = useState<Roster>(() => initialRoster(staffList));
  const [rosterDept, setRosterDept] = useState("ALL");
  const rosterStaff = useMemo(() => (rosterDept === "ALL" ? staff : staff.filter((s) => s.department === rosterDept)), [staff, rosterDept]);
  const setShift = useCallback((staffId: number, day: string, shift: ShiftType) => {
    setRoster((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [day]: shift } }));
  }, []);
  const rosterStats = useMemo(() => {
    const counts: Record<ShiftType, number> = { MORNING: 0, EVENING: 0, NIGHT: 0, OFF: 0 };
    Object.values(roster).forEach((days) => Object.values(days).forEach((s) => counts[s]++));
    return counts;
  }, [roster]);

  /* ───────────── rooms tab ───────────── */
  const roomStats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const attentionCount = useMemo(() => countRoomsNeedingAttention(liveRooms, tickets), [liveRooms, tickets]);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloor, setRoomFloor] = useState<number | "ALL">("ALL");
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("ALL");
  const floors = useMemo(() => [...new Set(liveRooms.map((r) => r.floor))].sort((a, b) => a - b), [liveRooms]);
  const floorOptions = useMemo(() => [{ value: "ALL" as const, label: "All floors" }, ...floors.map((f) => ({ value: f, label: `Floor ${f}` }))], [floors]);
  const roomFilterOptions = useMemo(
    () => [
      { value: "ALL" as const, label: "All" },
      { value: "ATTENTION" as const, label: "Needs attention", count: attentionCount },
      { value: "OCCUPIED" as const, label: "Occupied", count: liveRooms.filter((r) => r.is_occupied).length },
      { value: "VACANT_CLEAN" as const, label: "Ready", count: liveRooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length },
      { value: "DIRTY" as const, label: "Dirty", count: liveRooms.filter((r) => r.cleaning_status === "DIRTY").length },
    ],
    [liveRooms, attentionCount]
  );
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
  const [recDept, setRecDept] = useState("ALL");
  const [recStatus, setRecStatus] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("ALL");
  const recDeptOptions = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((t) => counts.set(t.department, (counts.get(t.department) ?? 0) + 1));
    return [
      { value: "ALL", label: `All departments (${tickets.length})` },
      ...activeDepartments.map((d) => ({ value: d.code, label: `${d.name} (${counts.get(d.code) ?? 0})` })),
    ];
  }, [tickets, activeDepartments]);
  const filteredTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (recDept !== "ALL" && t.department !== recDept) return false;
      if (recStatus !== "ALL" && t.status !== recStatus) return false;
      if (dateRange !== "ALL" && t.created_at) {
        const days = (now - new Date(t.created_at).getTime()) / DAY_MS;
        if (dateRange === "TODAY" && days > 1) return false;
        if (dateRange === "WEEK" && days > 7) return false;
        if (dateRange === "MONTH" && days > 30) return false;
        if (dateRange === "ARCHIVE" && days <= 30) return false;
      }
      return true;
    });
  }, [tickets, recDept, recStatus, dateRange]);

  /* ───────────── analytics tab ───────────── */
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

  /* ───────────── room detail + actions ───────────── */
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = useMemo(() => liveRooms.find((r) => r.id === selectedRoomId) ?? null, [liveRooms, selectedRoomId]);
  const openRoom = useCallback((room: HotelRoom) => setSelectedRoomId(room.id), []);
  const [logMode, setLogMode] = useState<"NEW" | "PAST">("NEW");

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

  const createTicket = async (input: NewTicketInput) => {
    if (!selectedRoom) return false;
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createRapidReclamation({
          roomId: selectedRoom.id,
          department: input.department,
          category: input.category,
          priority: input.priority,
          description: input.description || `HR ticket for room ${selectedRoom.room_number}`,
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
          description: input.description || `Historical log for room ${selectedRoom.room_number}`,
          status: input.status,
          createdAt: input.createdAt,
          isConfidential: false,
        });
        if (res.success && res.data) setTickets((prev) => [res.data as Reclamation, ...prev]);
        flash(res.success ? "success" : "danger", res.success ? `Past incident recorded for room ${selectedRoom.room_number}.` : res.error || "Could not record the incident.");
        resolve(Boolean(res.success));
      })
    );
  };

  /* ───────────── add staff ───────────── */
  const [showCreate, setShowCreate] = useState(false);
  const createStaff = async (input: NewStaffInput) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const res = await createStaffMember({ ...input, shift_status: "ON_SHIFT" });
        if (res.success) {
          setShowCreate(false);
          flash("success", `${input.full_name} was added to the directory.`);
        } else flash("danger", res.error || "Could not add the employee.");
        resolve(Boolean(res.success));
      })
    );

  /* ───────────── navigation ───────────── */
  const go = useCallback((tab: Tab) => startTabTransition(() => setActiveTab(tab)), []);
  const navItems = useMemo<NavTabItem[]>(
    () => [
      { id: "EMPLOYEES", label: "Staff & Shifts", icon: <Users aria-hidden />, badge: staff.length, badgeTone: "neutral", isActive: activeTab === "EMPLOYEES", onClick: () => go("EMPLOYEES") },
      { id: "ROOMS", label: "Rooms", icon: <BedDouble aria-hidden />, badge: attentionCount, badgeTone: "alert", isActive: activeTab === "ROOMS", onClick: () => go("ROOMS") },
      { id: "RECLAMATIONS", label: "Tickets", icon: <ClipboardList aria-hidden />, badge: openCount, badgeTone: "alert", isActive: activeTab === "RECLAMATIONS", onClick: () => go("RECLAMATIONS") },
      { id: "STATS", label: "Analytics", icon: <ChartColumn aria-hidden />, isActive: activeTab === "STATS", onClick: () => go("STATS") },
    ],
    [activeTab, staff.length, attentionCount, openCount, go]
  );

  const deptFilterOptions = useMemo(() => [{ value: "ALL", label: "All departments" }, ...deptOptions], [deptOptions]);
  const largest = headcount[0];

  return (
    <AppShell
      items={navItems}
      departmentName="Human Resources & Roster"
      departmentCode="HR"
      tone="success"
    >
      <PageStack>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        {activeTab === "EMPLOYEES" && (
          <>
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

            {subTab === "DIRECTORY" && (
              <>
                <KpiGrid>
                  <Kpi label="Total staff" value={staff.length} hint="In the directory" icon={<Users />} />
                  <Kpi label="On shift" value={onShiftCount} hint="Working now" tone="success" icon={<UserCheck />} />
                  <Kpi label="Off shift" value={staff.length - onShiftCount} hint="Off or on break" icon={<UserX />} />
                  <Kpi label="Departments" value={activeDepartments.length} hint="Managed by HR" icon={<Building2 />} />
                </KpiGrid>

                <Panel
                  title="Staff directory"
                  description={`${filteredStaff.length} of ${plural(staff.length, "employee")}`}
                  icon={<Users />}
                  actions={
                    <Button variant="primary" onClick={() => setShowCreate(true)} leftIcon={<UserPlus className="size-4" aria-hidden />} className="h-10">
                      Add staff
                    </Button>
                  }
                >
                  <div className="mb-4">
                    <FilterBar>
                      <SearchInput label="Search staff" placeholder="Name or role" value={search} onChange={setSearch} />
                      <SelectField label="Department" icon={<Building2 />} value={selectedDept} onChange={setSelectedDept} options={deptFilterOptions} />
                    </FilterBar>
                  </div>
                  <DataTable<Staff>
                    rows={filteredStaff}
                    columns={staffColumns}
                    getRowLabel={(s) => `${s.full_name}, ${roleLabel(s.role)}`}
                    selectable={false}
                    searchable={false}
                    maxHeight={null}
                    defaultSort={{ key: "full_name", dir: "asc" }}
                    pageSize={25}
                    density="comfortable"
                    emptyState={<EmptyState icon={<Users />} title="No staff found" description="Nothing matches this search and department." />}
                    ariaLabel="Staff directory"
                  />
                </Panel>
              </>
            )}

            {subTab === "SHIFTS" && (
              <>
                <KpiGrid>
                  {SHIFT_TYPES.map((s) => {
                    const Icon = SHIFT_ICONS[s];
                    return (
                      <Kpi
                        key={s}
                        label={SHIFT_LABELS[s].label}
                        value={rosterStats[s]}
                        hint={s === "OFF" ? `Rest days · ${SHIFT_LABELS[s].time}` : `Slots · ${SHIFT_LABELS[s].time}`}
                        tone={SHIFT_LABELS[s].tone}
                        icon={<Icon />}
                      />
                    );
                  })}
                </KpiGrid>

                <Panel
                  title="Weekly roster"
                  description="Plan daily shifts for the week. Changes stay on this device and are not saved."
                  icon={<CalendarDays />}
                  actions={<SelectField label="Roster department" icon={<Building2 />} value={rosterDept} onChange={setRosterDept} options={deptFilterOptions} className="w-full sm:w-56" />}
                >
                  {rosterStaff.length === 0 ? (
                    <EmptyState icon={<CalendarDays />} title="No staff in this department" />
                  ) : isDesktop ? (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full min-w-[56rem] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface-raised text-left text-xs text-fg-muted">
                            <th scope="col" className="sticky left-0 z-10 bg-surface-raised px-3 py-2.5 font-medium">
                              Employee
                            </th>
                            {WEEKDAYS.map((d) => (
                              <th key={d} scope="col" className="px-2 py-2.5 font-medium">
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rosterStaff.map((m) => (
                            <RosterRow key={m.id} member={m} shifts={roster[m.id]} onChange={setShift} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {rosterStaff.map((m) => (
                        <RosterCard key={m.id} member={m} shifts={roster[m.id]} onChange={setShift} />
                      ))}
                    </ul>
                  )}
                </Panel>
              </>
            )}
          </>
        )}

        {activeTab === "ROOMS" && (
          <Panel title="Rooms" description={`${filteredRooms.length} of ${liveRooms.length} rooms`} icon={<BedDouble />}>
            <div className="mb-5 flex flex-col gap-3">
              <FilterBar>
                <SearchInput label="Search rooms" placeholder="Room number" value={roomSearch} onChange={setRoomSearch} />
                <SelectField label="Floor" icon={<Layers />} value={roomFloor} onChange={setRoomFloor} options={floorOptions} />
              </FilterBar>
              <PillGroup label="Room status" value={roomFilter} onChange={setRoomFilter} options={roomFilterOptions} />
            </div>
            <RoomGrid rooms={filteredRooms} tickets={tickets} onSelect={openRoom} />
          </Panel>
        )}

        {activeTab === "RECLAMATIONS" && (
          <Panel title="Tickets" description={`${plural(filteredTickets.length, "ticket")} · ${openCount} open`} icon={<ClipboardList />}>
            <div className="mb-4 flex flex-col gap-3">
              <FilterBar>
                <SelectField label="Department" icon={<Building2 />} value={recDept} onChange={setRecDept} options={recDeptOptions} />
                <SelectField label="Status" icon={<ListFilter />} value={recStatus} onChange={setRecStatus} options={STATUS_OPTIONS} />
              </FilterBar>
              <PillGroup label="Date range" value={dateRange} onChange={setDateRange} options={DATE_RANGES} />
            </div>
            <TicketTable tickets={filteredTickets} />
          </Panel>
        )}

        {activeTab === "STATS" && (
          <>
            <KpiGrid>
              <Kpi label="Total staff" value={staff.length} icon={<Users />} />
              <Kpi label="On shift" value={onShiftCount} hint={staff.length ? `${Math.round((onShiftCount / staff.length) * 100)}% of staff` : "–"} tone="success" icon={<UserCheck />} />
              <Kpi label="Staffed departments" value={headcount.length} hint={`of ${activeDepartments.length} departments`} icon={<Building2 />} />
              <Kpi label="Largest department" value={largest ? largest.label : "–"} hint={largest ? plural(largest.onShift + largest.offShift, "employee") : "No staff yet"} icon={<ChartColumn />} />
            </KpiGrid>
            <Panel title="Headcount per department" description="Employees on and off shift" icon={<ChartColumn />}>
              {headcount.length > 0 ? (
                <BarChart
                  data={headcount}
                  series={[
                    { key: "onShift", label: "On shift", color: "var(--success)" },
                    { key: "offShift", label: "Off shift", color: "var(--info)" },
                  ]}
                  variant="stacked"
                  height={260}
                  ariaLabel="Staff headcount per department"
                />
              ) : (
                <EmptyState icon={<Users />} title="No staff yet" description="Headcount appears once employees are added." />
              )}
            </Panel>
          </>
        )}
      </PageStack>

      <RoomDetail
        room={selectedRoom}
        tickets={tickets}
        onClose={() => setSelectedRoomId(null)}
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
                { value: "NEW", label: "New ticket" },
                { value: "PAST", label: "Past incident" },
              ]}
            />
            {logMode === "NEW" ? (
              <NewTicketForm onSubmit={createTicket} pending={isPending} submitLabel="Create ticket" />
            ) : (
              <PastIncidentForm onSubmit={recordPast} pending={isPending} />
            )}
          </div>
        }
      />

      <AddStaffSheet open={showCreate} onOpenChange={setShowCreate} departments={deptOptions} pending={isPending} onSubmit={createStaff} />

      <ResponsiveSheet
        open={pending !== null}
        onOpenChange={(o) => !o && !isPending && setPending(null)}
        title={pending?.kind === "delete" ? "Remove employee" : "Mark absent"}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPending(null)} disabled={isPending} className="justify-center">
              Cancel
            </Button>
            <Button
              variant={pending?.kind === "delete" ? "destructive" : "primary"}
              onClick={confirmPending}
              isLoading={isPending}
              loadingText={pending?.kind === "delete" ? "Removing" : "Updating"}
              className="justify-center"
            >
              {pending?.kind === "delete" ? "Remove" : "Mark absent"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          {pending?.kind === "delete"
            ? `Remove ${pending.member.full_name} from the staff directory? Their tickets become unassigned. This can't be undone.`
            : `Mark ${pending?.member.full_name ?? "this employee"} absent today and reassign their open tickets?`}
        </p>
      </ResponsiveSheet>
    </AppShell>
  );
}

/* ───────────── roster rows ───────────── */

type RosterProps = { member: Staff; shifts?: Record<string, ShiftType>; onChange: (id: number, day: string, shift: ShiftType) => void };

function ShiftSelect({ member, day, shift, onChange }: { member: Staff; day: string; shift: ShiftType; onChange: RosterProps["onChange"] }) {
  const Icon = SHIFT_ICONS[shift];
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
      <Select
        aria-label={`${member.full_name}, ${day}`}
        value={shift}
        options={SHIFT_OPTIONS}
        onChange={(e) => onChange(member.id, day, e.target.value as ShiftType)}
        className="pl-8"
      />
    </div>
  );
}

const RosterRow = memo(function RosterRow({ member, shifts, onChange }: RosterProps) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium">
        <span className="block max-w-44 truncate">{member.full_name}</span>
        <span className="block truncate text-xs font-normal text-fg-muted">{roleLabel(member.role)}</span>
      </th>
      {WEEKDAYS.map((day) => (
        <td key={day} className="min-w-32 px-1.5 py-2">
          <ShiftSelect member={member} day={day} shift={shifts?.[day] ?? "MORNING"} onChange={onChange} />
        </td>
      ))}
    </tr>
  );
});

const RosterCard = memo(function RosterCard({ member, shifts, onChange }: RosterProps) {
  const DeptIcon = departmentIcon(member.department);
  return (
    <li className="rounded-lg border border-border bg-surface-raised p-3.5">
      <p className="font-medium">{member.full_name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
        <DeptIcon className="size-3.5" aria-hidden />
        {roleLabel(member.role)} · {departmentLabel(member.department)}
      </p>
      <dl className="mt-3 flex flex-col gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
            <dt className="text-sm text-fg-secondary">{day}</dt>
            <dd>
              <ShiftSelect member={member} day={day} shift={shifts?.[day] ?? "MORNING"} onChange={onChange} />
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
});

/* ───────────── add staff sheet (owns its form state) ───────────── */

type NewStaffInput = { full_name: string; role: string; department: string; phone_number?: string };

function AddStaffSheet({ open, onOpenChange, departments, pending, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { value: string; label: string }[];
  pending: boolean;
  onSubmit: (input: NewStaffInput) => Promise<boolean>;
}) {
  const id = useId();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("receptionist");
  const [department, setDepartment] = useState("RECEPTION");
  const [phone, setPhone] = useState("");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add employee"
      description="Create a staff profile. New employees start on shift."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="justify-center">
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} variant="primary" isLoading={pending} loadingText="Saving" leftIcon={<UserPlus className="size-4" aria-hidden />} className="justify-center">
            Create profile
          </Button>
        </div>
      }
    >
      <form
        id={`${id}-form`}
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const name = fullName.trim();
          if (!name) return;
          const ok = await onSubmit({ full_name: name, role, department, phone_number: phone.trim() || undefined });
          if (ok) {
            setFullName("");
            setPhone("");
          }
        }}
      >
        <Field label="Full name" htmlFor={`${id}-name`}>
          <TextInput id={`${id}-name`} required autoComplete="off" placeholder="e.g. Marc Vance" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor={`${id}-role`}>
            <Select id={`${id}-role`} value={role} options={ROLE_OPTIONS} onChange={(e) => setRole(e.target.value)} />
          </Field>
          <Field label="Department" htmlFor={`${id}-dept`}>
            <Select id={`${id}-dept`} value={department} options={departments} onChange={(e) => setDepartment(e.target.value)} />
          </Field>
        </div>
        <Field label="Phone number" htmlFor={`${id}-phone`} hint="Optional">
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <TextInput id={`${id}-phone`} type="tel" placeholder="+33 6 12 34 56 78" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
          </div>
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
