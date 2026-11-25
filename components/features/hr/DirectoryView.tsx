"use client";

import { memo, useMemo } from "react";
import { Building2, Power, Trash2, UserCheck, UserMinus, UserPlus, UserRound, Users, UserX } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { ToneBadge } from "@/components/features/StatusBadges";
import { departmentIcon } from "@/lib/icons";
import { plural } from "@/lib/format";
import { roleLabel, SHIFT_STATUS } from "./staff";

const rowLabel = (s: Staff) => `${s.full_name}, ${roleLabel(s.role)}`;

/**
 * HR "Directory" sub-tab: headcount KPIs and the staff table with row
 * actions. Search and department filter are controlled by the portal, which
 * also shows the filtered count on the sub-tab.
 */
export const DirectoryView = memo(function DirectoryView({
  staff,
  rows,
  onShiftCount,
  departmentCount,
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  departmentOptions,
  departmentName,
  pending,
  onToggleShift,
  onMarkAbsent,
  onRemove,
  onAdd,
}: {
  staff: readonly Staff[];
  /** `staff` after search and department filter. */
  rows: Staff[];
  onShiftCount: number;
  departmentCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  departmentOptions: readonly { value: string; label: string }[];
  departmentName: (code?: string | null) => string;
  pending: boolean;
  onToggleShift: (member: Staff) => void;
  onMarkAbsent: (member: Staff) => void;
  onRemove: (member: Staff) => void;
  onAdd: () => void;
}) {
  const columns = useMemo<DataTableColumn<Staff>[]>(
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
            <span className="min-w-0 truncate font-medium text-fg">{s.full_name}</span>
          </span>
        ),
      },
      {
        key: "role",
        header: "Role",
        width: "minmax(0, 1fr)",
        accessor: (s) => roleLabel(s.role),
        cell: (s) => <span className="block min-w-0 truncate text-fg-secondary">{roleLabel(s.role)}</span>,
      },
      {
        key: "department",
        header: "Department",
        width: "minmax(0, 1.3fr)",
        accessor: (s) => departmentName(s.department || "RECEPTION"),
        cell: (s) => {
          const Icon = departmentIcon(s.department || "RECEPTION");
          return (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-fg-secondary">
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0 truncate">{departmentName(s.department || "RECEPTION")}</span>
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
        cell: (s) => <span className="block min-w-0 truncate tabular-nums text-fg-secondary">{s.phone_number || "–"}</span>,
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
            <Button variant="secondary" size="touch" onClick={() => onToggleShift(s)} disabled={pending} leftIcon={<Power className="size-4" aria-hidden />}>
              {s.shift_status === "ON_SHIFT" ? "End shift" : "Start shift"}
            </Button>
            <Button variant="outline" size="touch" onClick={() => onMarkAbsent(s)} disabled={pending} leftIcon={<UserMinus className="size-4" aria-hidden />}>
              Absent
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onRemove(s)} disabled={pending} aria-label={`Remove ${s.full_name}`}>
              <Trash2 className="size-4 text-danger" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [departmentName, onToggleShift, onMarkAbsent, onRemove, pending]
  );

  return (
    <>
      <KpiGrid>
        <Kpi label="Total staff" value={staff.length} hint="In the directory" icon={<Users />} />
        <Kpi label="On shift" value={onShiftCount} hint="Working now" tone="success" icon={<UserCheck />} />
        <Kpi label="Off shift" value={staff.length - onShiftCount} hint="Off or on break" icon={<UserX />} />
        <Kpi label="Departments" value={departmentCount} hint="Managed by HR" icon={<Building2 />} />
      </KpiGrid>

      <Panel
        title="Staff directory"
        description={`${rows.length} of ${plural(staff.length, "employee")}`}
        icon={<Users />}
        actions={
          <Button variant="primary" size="touch" onClick={onAdd} leftIcon={<UserPlus className="size-4" aria-hidden />}>
            Add staff
          </Button>
        }
      >
        <div className="mb-4">
          <FilterBar>
            <SearchInput label="Search staff" placeholder="Name or role" value={search} onChange={onSearchChange} />
            <SelectField label="Department" icon={<Building2 />} value={department} onChange={onDepartmentChange} options={departmentOptions} />
          </FilterBar>
        </div>
        <DataTable<Staff>
          rows={rows}
          columns={columns}
          getRowLabel={rowLabel}
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
  );
});
