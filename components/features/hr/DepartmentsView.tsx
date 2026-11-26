"use client";

import { memo, useMemo } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Department, Staff } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableActions, rowIconButton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState, Panel } from "@/components/features/Panel";
import { departmentIcon } from "@/lib/icons";
import { plural } from "@/lib/format";
import { staffDepartment } from "./staff";

type Row = Department & { headcount: number };

/** HR "Services" sub-tab: the hotel's departments with their headcount, add / edit / delete. */
export const DepartmentsView = memo(function DepartmentsView({
  departments,
  staff,
  pending,
  onAdd,
  onEdit,
  onRemove,
}: {
  departments: readonly Department[];
  staff: readonly Staff[];
  pending: boolean;
  onAdd: () => void;
  onEdit: (department: Department) => void;
  onRemove: (department: Department) => void;
}) {
  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>();
    for (const s of staff) counts.set(staffDepartment(s), (counts.get(staffDepartment(s)) ?? 0) + 1);
    return departments.map((d) => ({ ...d, headcount: counts.get(d.code) ?? 0 }));
  }, [departments, staff]);

  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      {
        key: "name",
        header: "Service",
        primary: true,
        minWidth: 12,
        grow: 2,
        cell: (d) => {
          const Icon = departmentIcon(d.code);
          return (
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-fg-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{d.name}</span>
                {d.description && <span className="block truncate text-xs text-fg-muted">{d.description}</span>}
              </span>
            </span>
          );
        },
      },
      {
        key: "head_of_department",
        header: "Responsable",
        minWidth: 9,
        priority: 2,
        accessor: (d) => d.head_of_department ?? "",
        cell: (d) => <span className="block truncate text-fg-secondary">{d.head_of_department || "–"}</span>,
      },
      {
        key: "headcount",
        header: "Effectif",
        minWidth: 6,
        grow: 0.6,
        cell: (d) => <span className="tabular-nums text-fg-secondary">{plural(d.headcount, "employé")}</span>,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        minWidth: 7, // two icon buttons + padding
        grow: 0.6,
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (d, { layout }) => (
          <DataTableActions layout={layout}>
            <Button variant="ghost" size={rowIconButton(layout)} className="flex-none" title={`Modifier ${d.name}`} aria-label={`Modifier ${d.name}`} onClick={() => onEdit(d)} disabled={pending}>
              <Pencil className="size-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size={rowIconButton(layout)} className="flex-none" title={`Supprimer ${d.name}`} aria-label={`Supprimer ${d.name}`} onClick={() => onRemove(d)} disabled={pending}>
              <Trash2 className="size-3.5 text-danger" aria-hidden />
            </Button>
          </DataTableActions>
        ),
      },
    ],
    [onEdit, onRemove, pending]
  );

  return (
    <Panel
      title="Services de l’hôtel"
      description={plural(departments.length, "service")}
      icon={<Building2 />}
      actions={
        <Button variant="primary" size="touch" onClick={onAdd} leftIcon={<Plus className="size-4" aria-hidden />}>
          Ajouter un service
        </Button>
      }
    >
      <DataTable<Row>
        rows={rows}
        columns={columns}
        getRowLabel={(d) => d.name}
        selectable={false}
        searchable={false}
        maxHeight={null}
        defaultSort={{ key: "name", dir: "asc" }}
        pageSize={50}
        density="compact"
        emptyState={<EmptyState icon={<Building2 />} title="Aucun service" description="Ajoutez les services de l’hôtel pour y rattacher le personnel." />}
        ariaLabel="Services de l’hôtel"
      />
    </Panel>
  );
});
