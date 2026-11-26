"use client";

import type { TicketActionsRender } from "@/components/features/TicketActions";
import { memo, useMemo, type ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Reclamation } from "@/utils/roomsData";
import { categoryIcon, departmentIcon } from "@/lib/icons";
import { categoryLabel, departmentLabel, formatIncidentDate } from "@/lib/format";
import { TICKET_PRIORITY, TICKET_STATUS } from "@/lib/tickets";
import { EmptyState } from "./Panel";
import { PriorityBadge, TicketStatusBadge } from "./StatusBadges";


/**
 * Ticket list shared by every portal: sortable table on wide screens,
 * stacked cards below 640px (easyui DataTable). Role-specific buttons go in
 * `actions`.
 */
export const TicketTable = memo(function TicketTable({
  tickets,
  actions,
  onRowClick,
  pageSize = 25,
  emptyTitle = "Aucune demande",
  emptyDescription = "Aucune demande ne correspond à ces filtres.",
  ariaLabel = "Demandes",
}: {
  tickets: readonly Reclamation[];
  actions?: TicketActionsRender;
  onRowClick?: (ticket: Reclamation) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  ariaLabel?: string;
}) {
  const columns = useMemo<DataTableColumn<Reclamation>[]>(() => {
    const cols: DataTableColumn<Reclamation>[] = [
      {
        key: "category",
        header: "Problème",
        primary: true,
        minWidth: 11,
        grow: 2.2,
        accessor: (t) => categoryLabel(t.category),
        cell: (t) => {
          const Icon = categoryIcon(t.category);
          return (
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-fg-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{categoryLabel(t.category)}</span>
                {t.description && <span className="block truncate text-xs text-fg-muted">{t.description}</span>}
              </span>
            </span>
          );
        },
      },
      {
        key: "room",
        header: "Chambre",
        minWidth: 6, // « Chambre » header + sort icon
        grow: 0.6,
        accessor: (t) => Number(t.room?.room_number ?? t.room_id),
        cell: (t) => <span className="font-medium tabular-nums">{t.room?.room_number ?? t.room_id}</span>,
      },
      {
        key: "department",
        header: "Service",
        minWidth: 8,
        grow: 1.1,
        accessor: (t) => departmentLabel(t.department),
        cell: (t) => {
          const Icon = departmentIcon(t.department);
          return (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-fg-secondary">
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0 truncate">{departmentLabel(t.department)}</span>
            </span>
          );
        },
      },
      {
        key: "priority",
        header: "Priorité",
        minWidth: 7, // « Urgente » badge + cell padding
        grow: 0.7,
        accessor: (t) => TICKET_PRIORITY[t.priority]?.order ?? 9,
        cell: (t) => <PriorityBadge priority={t.priority} />,
      },
      {
        key: "status",
        header: "Statut",
        minWidth: 9, // « Prise en charge » badge with dot + padding
        grow: 0.8,
        accessor: (t) => TICKET_STATUS[t.status]?.order ?? 9,
        cell: (t) => <TicketStatusBadge status={t.status} />,
      },
      {
        key: "created_at",
        header: "Signalée",
        minWidth: 8,
        accessor: (t) => (t.created_at ? new Date(t.created_at).getTime() : 0),
        // Date with the assignee underneath: one column instead of two keeps the
        // Issue column readable next to the sidebar on laptop widths.
        cell: (t) => {
          const d = formatIncidentDate(t.created_at);
          return (
            <span className="flex min-w-0 flex-col">
              <span title={d.full} className="whitespace-nowrap text-fg-secondary">
                {d.relative}
              </span>
              <span className="truncate text-xs text-fg-muted">{t.assigned_to?.full_name ?? "Non assignée"}</span>
            </span>
          );
        },
      },
    ];
    if (actions) {
      cols.push({
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        // Room for the buttons this portal can show; never `auto` (each row is its own grid).
        minWidth: actions.maxButtons > 1 ? 15.5 : 8.5,
        grow: 0.8,
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (t) => {
          const node = actions(t);
          return node ? <div className="flex justify-end gap-2">{node}</div> : null;
        },
      });
    }
    return cols;
  }, [actions]);

  return (
    <DataTable<Reclamation>
      rows={tickets as Reclamation[]}
      columns={columns}
      getRowLabel={(t) => `Demande ${t.id}, chambre ${t.room?.room_number ?? t.room_id}, ${categoryLabel(t.category)}`}
      searchable={false}
      selectable={false}
      maxHeight={null}
      defaultSort={{ key: "created_at", dir: "desc" }}
      pageSize={pageSize}
      density="comfortable"
      onRowClick={onRowClick}
      emptyState={<EmptyState icon={<ClipboardList />} title={emptyTitle} description={emptyDescription} />}
      ariaLabel={ariaLabel}
    />
  );
});
