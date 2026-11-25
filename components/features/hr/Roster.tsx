"use client";

import { memo, useMemo, useState } from "react";
import { Building2, CalendarDays } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { SelectField } from "@/components/features/Filters";
import { Select } from "@/components/features/Forms";
import { MD_UP, useMediaQuery } from "@/hooks/useMediaQuery";
import { departmentLabel } from "@/lib/format";
import { departmentIcon, SHIFT_ICONS } from "@/lib/icons";
import { SHIFT_LABELS, type ShiftType } from "@/lib/constants";
import { roleLabel } from "./staff";

export type Roster = Record<number, Record<string, ShiftType>>;
type OnShiftChange = (staffId: number, day: string, shift: ShiftType) => void;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
 * HR "Shifts" sub-tab: shift totals and the weekly roster (table from md,
 * cards on phones). The roster itself is owned by the portal.
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
  const isDesktop = useMediaQuery(MD_UP);
  const [department, setDepartment] = useState("ALL");
  const rows = useMemo(() => (department === "ALL" ? staff : staff.filter((s) => s.department === department)), [staff, department]);
  const totals = useMemo(() => {
    const counts: Record<ShiftType, number> = { MORNING: 0, EVENING: 0, NIGHT: 0, OFF: 0 };
    Object.values(roster).forEach((days) => Object.values(days).forEach((s) => counts[s]++));
    return counts;
  }, [roster]);

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
        actions={
          <SelectField label="Roster department" icon={<Building2 />} value={department} onChange={setDepartment} options={departmentOptions} className="w-full sm:w-56" />
        }
      >
        {rows.length === 0 ? (
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
                {rows.map((m) => (
                  <RosterRow key={m.id} member={m} shifts={roster[m.id]} onChange={onShiftChange} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((m) => (
              <RosterCard key={m.id} member={m} shifts={roster[m.id]} onChange={onShiftChange} />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
});

type RosterProps = { member: Staff; shifts?: Record<string, ShiftType>; onChange: OnShiftChange };

function ShiftSelect({ member, day, shift, onChange }: { member: Staff; day: string; shift: ShiftType; onChange: OnShiftChange }) {
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
    <li className="min-w-0 rounded-lg border border-border bg-surface-raised p-3.5">
      <p className="truncate font-medium">{member.full_name}</p>
      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
        <DeptIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">
          {roleLabel(member.role)} · {departmentLabel(member.department)}
        </span>
      </p>
      <dl className="mt-3 flex flex-col gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
            <dt className="text-sm text-fg-secondary">{day}</dt>
            <dd className="min-w-0">
              <ShiftSelect member={member} day={day} shift={shifts?.[day] ?? "MORNING"} onChange={onChange} />
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
});
