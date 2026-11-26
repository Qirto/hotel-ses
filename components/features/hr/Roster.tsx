"use client";

import { memo, useMemo } from "react";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { CalendarDays } from "lucide-react";
import type { RosterEntry, Staff } from "@/utils/roomsData";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { Select } from "@/components/features/Forms";
import { SHIFT_ICONS } from "@/lib/icons";
import { SHIFT_LABELS, type ShiftType } from "@/lib/constants";
import { roleLabel } from "./staff";

export type Roster = Record<number, Record<string, ShiftType>>;
type OnShiftChange = (staffId: number, day: string, shift: ShiftType) => void;

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SHIFT_TYPES: ShiftType[] = ["MORNING", "EVENING", "NIGHT", "OFF"];
const SHIFT_OPTIONS = SHIFT_TYPES.map((s) => ({ value: s, label: SHIFT_LABELS[s].label }));

const ROSTER_FILTERS = { q: "", service: "ALL" };

/** The saved roster (staff_roster rows) by employee and weekday name. */
export function rosterFromEntries(entries: readonly RosterEntry[]): Roster {
  const roster: Roster = {};
  for (const e of entries) {
    const day = WEEKDAYS[e.weekday - 1];
    if (day) (roster[e.staff_id] ??= {})[day] = e.shift;
  }
  return roster;
}

/** An employee's shift on a day; a day with nothing planned is a day off. */
export const shiftOf = (roster: Roster, staffId: number, day: string): ShiftType => roster[staffId]?.[day] ?? "OFF";

/**
 * HR "Shifts" sub-tab: shift totals and the weekly roster. The roster is the
 * shared DataTable (seven fluid day columns; the phone list when they no longer
 * fit). The roster itself is saved (staff_roster) and held by the staff layout.
 */
export const ShiftsView = memo(function ShiftsView({
  staff,
  roster,
  onShiftChange,
  departmentOptions,
}: {
  staff: readonly Staff[];
  roster: Roster;
  onShiftChange: OnShiftChange;
  departmentOptions: readonly { value: string; label: string }[];
}) {
  // Filters in the URL (/staff/shifts?service=…&q=…): kept on refresh, Back and shared links.
  const [filters, setFilters] = useUrlFilters(ROSTER_FILTERS);
  const department = filters.service;
  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return staff.filter(
      (s) => (department === "ALL" || s.department === department) && (!q || s.full_name.toLowerCase().includes(q) || roleLabel(s.role).toLowerCase().includes(q))
    );
  }, [staff, department, filters.q]);
  // Every current employee and day, so totals match what the table shows.
  const totals = useMemo(() => {
    const counts: Record<ShiftType, number> = { MORNING: 0, EVENING: 0, NIGHT: 0, OFF: 0 };
    for (const s of staff) for (const day of WEEKDAYS) counts[shiftOf(roster, s.id, day)]++;
    return counts;
  }, [staff, roster]);

  const columns = useMemo<DataTableColumn<Staff>[]>(
    () => [
      {
        key: "full_name",
        header: "Employé",
        primary: true,
        minWidth: 10,
        grow: 1.4,
        cell: (m) => (
          <span className="block min-w-0">
            <span className="block truncate font-medium text-fg">{m.full_name}</span>
            <span className="block truncate text-xs font-normal text-fg-muted">{roleLabel(m.role)}</span>
          </span>
        ),
      },
      ...WEEKDAYS.map<DataTableColumn<Staff>>((day) => ({
        key: day,
        header: day,
        sortable: false,
        minWidth: 7.25,
        accessor: (m) => SHIFT_LABELS[shiftOf(roster, m.id, day)].label,
        cell: (m) => (
          <ShiftSelect member={m} day={day} shift={shiftOf(roster, m.id, day)} onChange={onShiftChange} compact />
        ),
      })),
    ],
    [roster, onShiftChange]
  );

  return (
    <>
      <KpiGrid>
        {SHIFT_TYPES.map((s) => {
          const Icon = SHIFT_ICONS[s];
          return (
            <Kpi
              key={s}
              label={SHIFT_LABELS[s].label}
              value={totals[s]}
              hint={s === "OFF" ? "Jours de repos sur la semaine" : `Créneaux · ${SHIFT_LABELS[s].time}`}
              tone={SHIFT_LABELS[s].tone}
              icon={<Icon />}
            />
          );
        })}
      </KpiGrid>

      <Panel
        title="Planning hebdomadaire"
        description="Planning type de la semaine. Chaque changement est enregistré et visible par les ressources humaines."
        icon={<CalendarDays />}
      >
        <FilterBar className="mb-4">
          <SearchInput label="Rechercher un employé par nom ou poste" placeholder="Rechercher un employé" value={filters.q} onChange={(q) => setFilters({ q })} />
          <SelectField label="Service du planning" value={department} onChange={(service) => setFilters({ service })} options={departmentOptions} />
        </FilterBar>
        <DataTable<Staff>
          rows={rows}
          columns={columns}
          getRowLabel={(m) => `${m.full_name}, ${roleLabel(m.role)}`}
          selectable={false}
          searchable={false}
          maxHeight={null}
          defaultSort={{ key: "full_name", dir: "asc" }}
          pageSize={25}
          density="compact"
          emptyState={<EmptyState icon={<CalendarDays />} title={filters.q ? "Aucun employé ne correspond à la recherche" : "Aucun employé dans ce service"} />}
          ariaLabel="Planning hebdomadaire"
        />
      </Panel>
    </>
  );
});

function ShiftSelect({
  member,
  day,
  shift,
  onChange,
  compact = false,
}: {
  member: Staff;
  day: string;
  shift: ShiftType;
  onChange: OnShiftChange;
  /** Dense trigger inside table rows; full touch size in the phone list. */
  compact?: boolean;
}) {
  return (
    <Select
      aria-label={`${member.full_name}, ${day}`}
      size={compact ? "sm" : "md"}
      value={shift}
      options={SHIFT_OPTIONS}
      onChange={(v) => onChange(member.id, day, v)}
    />
  );
}
