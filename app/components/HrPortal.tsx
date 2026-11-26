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
import { StaffFormSheet } from "@/components/features/hr/StaffFormSheet";
import { DepartmentsView } from "@/components/features/hr/DepartmentsView";
import { DepartmentFormSheet, type DepartmentInput } from "@/components/features/hr/DepartmentFormSheet";
import { headcountByDepartment, type NewStaffInput } from "@/components/features/hr/staff";
import { usePortalState, useSyncedState } from "@/hooks/usePortalState";
import { useCleaningCycle } from "@/hooks/useCleaningCycle";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { departmentLabel, percent, plural } from "@/lib/format";
import type { ShiftType } from "@/lib/constants";
import {
  anonymizeStaffRecord,
  createDepartment,
  createStaffMember,
  deleteDepartment,
  deleteStaffMember,
  markStaffAbsentAndRedistribute,
  toggleStaffShift,
  undoStaffAbsence,
  updateDepartment,
  updateStaffMember,
} from "@/app/actions";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

type Tab = "EMPLOYEES" | "ROOMS" | "RECLAMATIONS" | "STATS";
type SubTab = "DIRECTORY" | "SHIFTS" | "DEPARTMENTS";
/** One confirmation step for any consequential action: what to say, and what to run. */
type Confirm = {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  tone: "primary" | "danger";
  action: () => Promise<void>;
} | null;

const NO_DEPARTMENTS: Department[] = [];
const NO_TICKETS: Reclamation[] = [];
const NO_ROOMS: HotelRoom[] = [];

const HEADCOUNT_SERIES: Series[] = [
  { key: "onShift", label: "En service", color: "var(--success)" },
  { key: "offShift", label: "Hors service", color: "var(--text-muted)" },
];

function HrPortalView({ staffList, departmentsList = NO_DEPARTMENTS, reclamationsList = NO_TICKETS, rooms = NO_ROOMS, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "EMPLOYEES", rooms, reclamations: reclamationsList });
  const { activeTab, tickets, liveRooms, isPending, run, runForResult, flash, openRoom, openCount, attentionCount } = p;
  const [subTab, setSubTab] = useState<SubTab>("DIRECTORY");
  const [staff, setStaff] = useSyncedState<Staff[]>(staffList);

  useRealtimeRefresh("realtime-hr", ["staff", "departments", "reclamations"], isLiveSupabase);

  /* ───────────── departments (the database is the only source) ───────────── */
  const [departments, setDepartments] = useSyncedState<Department[]>(departmentsList);
  const activeDepartments = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((d) => ({ code: d.code, name: d.name })),
    [departments]
  );
  const deptName = useCallback(
    (code?: string | null) => activeDepartments.find((d) => d.code === code)?.name ?? departmentLabel(code),
    [activeDepartments]
  );
  const deptCodes = useMemo(() => activeDepartments.map((d) => d.code), [activeDepartments]);
  const deptOptions = useMemo(() => activeDepartments.map((d) => ({ value: d.code, label: d.name })), [activeDepartments]);
  const deptFilterOptions = useMemo(() => [{ value: "ALL", label: "Tous les services" }, ...deptOptions], [deptOptions]);

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

  // Clocking in/out is one click and fully reversible: no confirmation, an « Annuler »
  // (undo) in the toast instead. Irreversible actions (absent, delete) confirm first.
  const toggleShift = useCallback(
    (member: Staff) => {
      const apply = (m: Staff, undoable: boolean) =>
        run(async () => {
          const res = await toggleStaffShift(m.id, m.shift_status);
          if (res.success) {
            const next = m.shift_status === "ON_SHIFT" ? "OFF_SHIFT" : "ON_SHIFT";
            setStaff((prev) => prev.map((s) => (s.id === m.id ? { ...s, shift_status: next, is_present: next === "ON_SHIFT" } : s)));
            flash(
              "success",
              `${m.full_name} est désormais ${next === "ON_SHIFT" ? "en service" : "hors service"}.`,
              undoable ? { label: "Annuler", onClick: () => apply({ ...m, shift_status: next }, false) } : undefined
            );
          } else flash("danger", `Impossible de mettre à jour le service de ${m.full_name}.`);
        });
      apply(member, true);
    },
    [run, setStaff, flash]
  );

  const [confirm, setConfirm] = useState<Confirm>(null);
  const cancelConfirm = useCallback(() => setConfirm(null), []);
  const runConfirm = () => {
    if (!confirm) return;
    const { action } = confirm;
    run(async () => {
      await action();
      setConfirm(null);
    });
  };

  const markAbsent = useCallback(
    async (member: Staff) => {
        const res = await markStaffAbsentAndRedistribute(member.id);
        if (res.success) {
          const { previousShift, previousPresent, substituteId, movedTicketIds, unassignedCount } = res.data;
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: "OFF_SHIFT", is_present: false } : s)));
          const detail = movedTicketIds.length
            ? `${plural(movedTicketIds.length, "demande réassignée", "demandes réassignées")} dans son service.`
            : unassignedCount
              ? `Aucun collègue présent dans son service : ${plural(unassignedCount, "demande reste", "demandes restent")} à réassigner.`
              : "Aucune demande ouverte à réassigner.";
          // Undo restores the previous status and takes back exactly the moved requests.
          const undo = () =>
            run(async () => {
              const back = await undoStaffAbsence(member.id, { shift: previousShift, present: previousPresent }, substituteId, movedTicketIds);
              if (back.success) {
                setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: previousShift, is_present: previousPresent } : s)));
                flash("success", `Absence de ${member.full_name} annulée.`);
              } else flash("danger", `Impossible d’annuler l’absence de ${member.full_name}.`);
            });
          flash("success", `${member.full_name} déclaré(e) absent(e). ${detail}`, { label: "Annuler", onClick: undo });
        } else flash("danger", `Impossible de déclarer ${member.full_name} absent(e).`);
    },
    [run, setStaff, flash]
  );

  const askAbsent = useCallback(
    (member: Staff) =>
      setConfirm({
        title: "Déclarer absent",
        description: `Déclarer ${member.full_name} absent(e) aujourd’hui\u202f? Ses demandes ouvertes passent à un collègue présent de son service.`,
        confirmLabel: "Déclarer absent",
        tone: "primary",
        action: () => markAbsent(member),
      }),
    [markAbsent]
  );

  const askRemove = useCallback(
    (member: Staff) =>
      setConfirm({
        title: "Retirer l’employé",
        description: `Retirer ${member.full_name} de l’annuaire du personnel\u202f? Ses demandes deviendront non assignées. Cette action est irréversible.`,
        confirmLabel: "Retirer",
        pendingLabel: "Retrait en cours",
        tone: "danger",
        action: async () => {
          const res = await deleteStaffMember(member.id);
          if (res.success) {
            setStaff((prev) => prev.filter((s) => s.id !== member.id));
            flash("success", `${member.full_name} a été retiré(e) de l’annuaire.`);
          } else flash("danger", `Impossible de retirer ${member.full_name}.`);
        },
      }),
    [setStaff, flash]
  );

  // Privacy policy: HR can anonymise a former employee's record from this space.
  const askAnonymize = useCallback(
    (member: Staff) => {
      setStaffForm((f) => ({ ...f, open: false }));
      setConfirm({
        title: "Anonymiser la fiche",
        description: `Remplacer le nom de ${member.full_name} par « Ancien collaborateur » et effacer son téléphone\u202f? L’historique des demandes est conservé. Cette action est irréversible.`,
        confirmLabel: "Anonymiser",
        pendingLabel: "Anonymisation",
        tone: "danger",
        action: async () => {
          const res = await anonymizeStaffRecord(member.id);
          if (res.success) {
            setStaff((prev) =>
              prev.map((s) => (s.id === member.id ? { ...s, full_name: "Ancien collaborateur", phone_number: "", shift_status: "OFF_SHIFT", is_present: false } : s))
            );
            flash("success", "La fiche a été anonymisée.");
          } else flash("danger", `Impossible d’anonymiser la fiche de ${member.full_name}.`);
        },
      });
    },
    [setStaff, flash]
  );

  /* ───────────── add / edit staff (one form) ───────────── */
  const [staffForm, setStaffForm] = useState<{ open: boolean; member: Staff | null }>({ open: false, member: null });
  const openCreate = useCallback(() => setStaffForm({ open: true, member: null }), []);
  const openEdit = useCallback((member: Staff) => setStaffForm({ open: true, member }), []);
  const setStaffFormOpen = useCallback((open: boolean) => setStaffForm((f) => ({ ...f, open })), []);
  const saveStaff = (input: NewStaffInput) =>
    runForResult(async () => {
      const member = staffForm.member;
      if (member) {
        const res = await updateStaffMember(member.id, { ...input, phone_number: input.phone_number ?? "" });
        if (res.success) {
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, ...input, phone_number: input.phone_number ?? "" } : s)));
          setStaffFormOpen(false);
          flash("success", `La fiche de ${input.full_name} a été mise à jour.`);
        } else flash("danger", res.error || `Impossible de mettre à jour la fiche de ${member.full_name}.`);
        return Boolean(res.success);
      }
      const res = await createStaffMember({ ...input, shift_status: "ON_SHIFT" });
      if (res.success) {
        setStaffFormOpen(false);
        flash("success", `${input.full_name} a été ajouté(e) à l’annuaire.`);
      } else flash("danger", res.error || "Impossible d’ajouter l’employé.");
      return Boolean(res.success);
    });

  /* ───────────── services (departments) CRUD ───────────── */
  const [deptForm, setDeptForm] = useState<{ open: boolean; department: Department | null }>({ open: false, department: null });
  const openCreateDept = useCallback(() => setDeptForm({ open: true, department: null }), []);
  const openEditDept = useCallback((department: Department) => setDeptForm({ open: true, department }), []);
  const setDeptFormOpen = useCallback((open: boolean) => setDeptForm((f) => ({ ...f, open })), []);
  const saveDepartment = (input: DepartmentInput) =>
    runForResult(async () => {
      const department = deptForm.department;
      if (department) {
        const res = await updateDepartment(department.id, input);
        if (res.success) {
          setDepartments((prev) => prev.map((d) => (d.id === department.id ? { ...d, ...input } : d)));
          setDeptFormOpen(false);
          flash("success", `Le service ${input.name} a été mis à jour.`);
        } else flash("danger", res.error || `Impossible de mettre à jour le service ${department.name}.`);
        return Boolean(res.success);
      }
      const res = await createDepartment(input);
      if (res.success) {
        if (res.data) setDepartments((prev) => [...prev, res.data as Department]);
        setDeptFormOpen(false);
        flash("success", `Le service ${input.name} a été créé.`);
      } else flash("danger", res.error || "Impossible de créer le service.");
      return Boolean(res.success);
    });
  const askRemoveDept = useCallback(
    (department: Department) =>
      setConfirm({
        title: "Supprimer le service",
        description: `Supprimer le service ${department.name}\u202f? Les demandes déjà enregistrées gardent leur service. Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        pendingLabel: "Suppression",
        tone: "danger",
        action: async () => {
          const res = await deleteDepartment(department.id);
          if (res.success) {
            setDepartments((prev) => prev.filter((d) => d.id !== department.id));
            flash("success", `Le service ${department.name} a été supprimé.`);
          } else flash("danger", res.error || `Impossible de supprimer le service ${department.name}.`);
        },
      }),
    [setDepartments, flash]
  );

  /* ───────────── shifts roster (client-side only) ───────────── */
  const [roster, setRoster] = useState<Roster>(() => initialRoster(staffList));
  const setShift = useCallback((staffId: number, day: string, shift: ShiftType) => {
    setRoster((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [day]: shift } }));
  }, []);

  /* ───────────── rooms + tickets ───────────── */
  const ticketMutations = useTicketMutations(p, "RH");
  const cycleCleaning = useCleaningCycle(p);

  /* ───────────── analytics ───────────── */
  const headcount = useMemo(() => headcountByDepartment(staff, deptName), [staff, deptName]);
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
              { id: "DIRECTORY", label: "Annuaire", icon: <Users className="size-4" aria-hidden />, badge: filteredStaff.length },
              { id: "SHIFTS", label: "Horaires", icon: <CalendarDays className="size-4" aria-hidden /> },
              { id: "DEPARTMENTS", label: "Services", icon: <Building2 className="size-4" aria-hidden />, badge: departments.length },
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
              onEdit={openEdit}
              onAdd={openCreate}
            />
          </TabPanel>

          <TabPanel active={subTab === "SHIFTS"}>
            <ShiftsView staff={staff} roster={roster} onShiftChange={setShift} departmentOptions={deptFilterOptions} />
          </TabPanel>

          <TabPanel active={subTab === "DEPARTMENTS"}>
            <DepartmentsView departments={departments} staff={staff} pending={isPending} onAdd={openCreateDept} onEdit={openEditDept} onRemove={askRemoveDept} />
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
            <Kpi label="Effectif total" value={staff.length} icon={<Users />} />
            <Kpi label="En service" value={onShiftCount} hint={`${percent(onShiftCount, staff.length)} du personnel`} tone="success" icon={<UserCheck />} />
            <Kpi label="Services pourvus" value={headcount.length} hint={`sur ${plural(activeDepartments.length, "service")}`} icon={<Building2 />} />
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

      <StaffFormSheet
        key={`staff-${staffForm.member?.id ?? "new"}`}
        open={staffForm.open}
        onOpenChange={setStaffFormOpen}
        member={staffForm.member}
        departments={deptOptions}
        pending={isPending}
        onSubmit={saveStaff}
        onAnonymize={askAnonymize}
      />

      <DepartmentFormSheet
        key={`dept-${deptForm.department?.id ?? "new"}`}
        open={deptForm.open}
        onOpenChange={setDeptFormOpen}
        department={deptForm.department}
        pending={isPending}
        onSubmit={saveDepartment}
      />

      <ConfirmSheet
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        pendingLabel={confirm?.pendingLabel}
        tone={confirm?.tone}
        pending={isPending}
        onConfirm={runConfirm}
        onCancel={cancelConfirm}
      />
    </AppShell>
  );
}

export default withNotices(HrPortalView);
