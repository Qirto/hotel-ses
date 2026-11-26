"use client";

import { memo, useMemo } from "react";
import { Building2, Pencil, Power, Trash2, UserCheck, UserMinus, UserPlus, UserRound, Users, UserX } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableActions, ROW_BUTTON, ROW_ICON_BUTTON, type DataTableColumn, rowFixedWidth } from "@/components/ui/data-table";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { ToneBadge } from "@/components/features/StatusBadges";
import { departmentIcon } from "@/lib/icons";
import { plural } from "@/lib/format";
import { roleLabel, SHIFT_STATUS, staffDepartment } from "./staff";

const rowLabel = (s: Staff) => `${s.full_name}, ${roleLabel(s.role)}`;

/**
 * HR "Directory" sub-tab: headcount KPIs and the staff table with row
 * actions. Search and service filter are controlled by the caller (kept in the URL).
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
  onEdit,
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
  onEdit: (member: Staff) => void;
  onAdd: () => void;
}) {
  const columns = useMemo<DataTableColumn<Staff>[]>(
    () => [
      {
        key: "full_name",
        header: "Employé",
        primary: true,
        minWidth: 11,
        grow: 1.6,
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
        header: "Fonction",
        minWidth: 8,
        priority: 3,
        accessor: (s) => roleLabel(s.role),
        cell: (s) => <span className="block min-w-0 truncate text-fg-secondary">{roleLabel(s.role)}</span>,
      },
      {
        key: "department",
        header: "Service",
        minWidth: 9,
        grow: 1.3,
        priority: 2,
        accessor: (s) => departmentName(staffDepartment(s)),
        cell: (s) => {
          const Icon = departmentIcon(staffDepartment(s));
          return (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-fg-secondary">
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0 truncate">{departmentName(staffDepartment(s))}</span>
            </span>
          );
        },
      },
      {
        key: "phone_number",
        header: "Téléphone",
        minWidth: 8.5,
        priority: 4,
        hideOnMobile: true,
        accessor: (s) => s.phone_number ?? "",
        cell: (s) => <span className="block min-w-0 truncate tabular-nums text-fg-secondary">{s.phone_number || "–"}</span>,
      },
      {
        key: "shift_status",
        header: "Présence",
        minWidth: 7.5,
        grow: 0.8,
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
        minWidth: 21, // measured: « Absent » 86 + toggle 116 + edit 40 + delete 40 + gaps 24 + padding 24 px
        grow: 1.2,
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (s) => {
          const size = ROW_BUTTON;
          const onShift = s.shift_status === "ON_SHIFT";
          return (
            <DataTableActions>
              <Button variant="outline" size={size} title="Déclarer absent" onClick={() => onMarkAbsent(s)} disabled={pending} leftIcon={<UserMinus className="size-3.5" aria-hidden />}>
                Absent
              </Button>
              {/* One width for both labels (« Commencer » is the longer): the buttons line up as columns down the list. */}
              <Button variant="secondary" size={size} {...rowFixedWidth("7.25rem")} title={onShift ? "Terminer le service" : "Commencer le service"} onClick={() => onToggleShift(s)} disabled={pending} leftIcon={<Power className="size-3.5" aria-hidden />}>
                {onShift ? "Terminer" : "Commencer"}
              </Button>
              <Button variant="ghost" size={ROW_ICON_BUTTON} className="flex-none" title={`Modifier ${s.full_name}`} onClick={() => onEdit(s)} disabled={pending} aria-label={`Modifier ${s.full_name}`}>
                <Pencil className="size-3.5" aria-hidden />
              </Button>
              <Button variant="ghost" size={ROW_ICON_BUTTON} className="flex-none" title={`Supprimer ${s.full_name}`} onClick={() => onRemove(s)} disabled={pending} aria-label={`Supprimer ${s.full_name}`}>
                <Trash2 className="size-3.5 text-danger" aria-hidden />
              </Button>
            </DataTableActions>
          );
        },
      },
    ],
    [departmentName, onToggleShift, onMarkAbsent, onRemove, onEdit, pending]
  );

  return (
    <>
      <KpiGrid>
        <Kpi label="Effectif total" value={staff.length} hint="Dans l’annuaire" icon={<Users />} />
        <Kpi label="En service" value={onShiftCount} hint="Au travail actuellement" tone="success" icon={<UserCheck />} />
        <Kpi label="Hors service" value={staff.length - onShiftCount} hint="En repos ou en pause" icon={<UserX />} />
        <Kpi label="Services" value={departmentCount} hint="Gérés par les RH" icon={<Building2 />} />
      </KpiGrid>

      <Panel
        title="Annuaire du personnel"
        description={`${rows.length} sur ${plural(staff.length, "employé")}`}
        icon={<Users />}
        actions={
          <Button variant="primary" size="touch" onClick={onAdd} leftIcon={<UserPlus className="size-4" aria-hidden />}>
            Ajouter un employé
          </Button>
        }
      >
        <div className="mb-4">
          <FilterBar>
            <SearchInput label="Rechercher un employé" placeholder="Nom ou fonction" value={search} onChange={onSearchChange} />
            <SelectField label="Service" value={department} onChange={onDepartmentChange} options={departmentOptions} />
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
          emptyState={<EmptyState icon={<Users />} title="Aucun employé trouvé" description="Aucun résultat pour cette recherche et ce service." />}
          ariaLabel="Annuaire du personnel"
        />
      </Panel>
    </>
  );
});
