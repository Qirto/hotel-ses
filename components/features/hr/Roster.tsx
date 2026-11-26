"use client";

import { memo, useMemo, useState } from "react";
import { Building2, CalendarDays } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SelectField } from "@/components/features/Filters";
import { Select } from "@/components/features/Forms";
import { SHIFT_ICONS } from "@/lib/icons";
import { SHIFT_LABELS, type ShiftType } from "@/lib/constants";
import { roleLabel } from "./staff";

export type Roster = Record<number, Record<string, ShiftType>>;
type OnShiftChange = (staffId: number, day: string, shift: ShiftType) => void;

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SHIFT_TYPES: ShiftType[] = ["MORNING", "EVENING", "NIGHT", "OFF"];
const SHIFT_OPTIONS = SHIFT_TYPES.map((s) => ({ value: s, label: SHIFT_LABELS[s].label }));

/** Seeded weekly pattern (client-side only, not persisted). */
export function initialRoster(staff: readonly Staff[]): Roster {
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

/**
 * HR "Shifts" sub-tab: shift totals and the weekly roster. The roster is the
 * shared DataTable (seven fluid day columns; stacked cards when they no longer
 * fit). The roster state itself is owned by the portal.
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
  const [department, setDepartment] = useState("ALL");
  const rows = useMemo(() => (department === "ALL" ? [...staff] : staff.filter((s) => s.department === department)), [staff, department]);
  const totals = useMemo(() => {
    const counts: Record<ShiftType, number> = { MORNING: 0, EVENING: 0, NIGHT: 0, OFF: 0 };
    Object.values(roster).forEach((days) => Object.values(days).forEach((s) => counts[s]++));
    return counts;
  }, [roster]);

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
        accessor: (m) => SHIFT_LABELS[roster[m.id]?.[day] ?? "MORNING"].label,
        cell: (m, { layout }) => (
          <ShiftSelect member={m} day={day} shift={roster[m.id]?.[day] ?? "MORNING"} onChange={onShiftChange} compact={layout === "table"} />
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
              hint={s === "OFF" ? `Jours de repos · ${SHIFT_LABELS[s].time}` : `Créneaux · ${SHIFT_LABELS[s].time}`}
              tone={SHIFT_LABELS[s].tone}
              icon={<Icon />}
            />
          );
        })}
      </KpiGrid>

      <Panel
        title="Planning hebdomadaire"
        description="Planifiez les horaires de la semaine. Les modifications restent sur cet appareil et ne sont pas enregistrées."
        icon={<CalendarDays />}
      >
        <FilterBar className="mb-4">
          <SelectField label="Service du planning" icon={<Building2 />} value={department} onChange={setDepartment} options={departmentOptions} />
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
          emptyState={<EmptyState icon={<CalendarDays />} title="Aucun employé dans ce service" />}
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
  /** Dense trigger inside table rows; full touch size on cards. */
  compact?: boolean;
}) {
  const Icon = SHIFT_ICONS[shift];
  return (
    <Select
      aria-label={`${member.full_name}, ${day}`}
      icon={<Icon />}
      size={compact ? "sm" : "md"}
      value={shift}
      options={SHIFT_OPTIONS}
      onChange={(v) => onChange(member.id, day, v)}
    />
  );
}
