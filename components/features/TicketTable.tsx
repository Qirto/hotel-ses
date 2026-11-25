"use client";

import { memo, useMemo, type ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Reclamation } from "@/utils/roomsData";
import { categoryIcon, departmentIcon } from "@/lib/icons";
import { departmentLabel, formatIncidentDate } from "@/lib/format";
import { PRIORITY_ORDER } from "@/lib/constants";
import { EmptyState } from "./Panel";
import { PriorityBadge, TicketStatusBadge } from "./StatusBadges";

const STATUS_ORDER = { OPEN: 0, ACKNOWLEDGED: 1, IN_PROGRESS: 2, RESOLVED: 3 } as const;

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
  emptyTitle = "No tickets",
  emptyDescription = "Nothing matches these filters.",
  ariaLabel = "Tickets",
}: {
  tickets: readonly Reclamation[];
  actions?: (ticket: Reclamation) => ReactNode;
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
        header: "Issue",
        primary: true,
        width: "minmax(0, 2.2fr)",
        accessor: (t) => t.category,
        cell: (t) => {
          const Icon = categoryIcon(t.category);
          return (
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-fg-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{t.category}</span>
                {t.description && <span className="block truncate text-xs text-fg-muted">{t.description}</span>}
              </span>
            </span>
          );
        },
      },
      {
        key: "room",
        header: "Room",
        width: "minmax(4.5rem, 0.6fr)",
        accessor: (t) => Number(t.room?.room_number ?? t.room_id),
        cell: (t) => <span className="font-medium tabular-nums">{t.room?.room_number ?? t.room_id}</span>,
      },
      {
        key: "department",
        header: "Department",
        width: "minmax(0, 1.1fr)",
        accessor: (t) => departmentLabel(t.department),
        cell: (t) => {
          const Icon = departmentIcon(t.department);
          return (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-fg-secondary">
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="truncate">{departmentLabel(t.department)}</span>
            </span>
          );
        },
      },
      {
        key: "priority",
        header: "Priority",
        width: "minmax(6rem, 0.8fr)",
        accessor: (t) => PRIORITY_ORDER[t.priority] ?? 9,
        cell: (t) => <PriorityBadge priority={t.priority} />,
      },
      {
        key: "status",
        header: "Status",
        width: "minmax(7.5rem, 0.9fr)",
        accessor: (t) => STATUS_ORDER[t.status] ?? 9,
        cell: (t) => <TicketStatusBadge status={t.status} />,
      },
      {
        key: "created_at",
        header: "Reported",
        width: "minmax(6.5rem, 0.8fr)",
        accessor: (t) => (t.created_at ? new Date(t.created_at).getTime() : 0),
        cell: (t) => {
          const d = formatIncidentDate(t.created_at);
          return (
            <span title={d.full} className="whitespace-nowrap text-fg-secondary">
              {d.relative}
            </span>
          );
        },
      },
      {
        key: "assigned",
        header: "Assignee",
        width: "minmax(0, 1fr)",
        hideOnMobile: true,
        accessor: (t) => t.assigned_to?.full_name ?? "",
        cell: (t) => <span className="truncate text-fg-secondary">{t.assigned_to?.full_name ?? "Unassigned"}</span>,
      },
    ];
    if (actions) {
      cols.push({
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        width: "minmax(8rem, auto)",
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (t) => {
          const node = actions(t);
          return node ? <div className="flex flex-wrap justify-end gap-2">{node}</div> : null;
        },
      });
    }
    return cols;
  }, [actions]);

  return (
    <DataTable<Reclamation>
      rows={tickets as Reclamation[]}
      columns={columns}
      getRowLabel={(t) => `Ticket ${t.id}, room ${t.room?.room_number ?? t.room_id}, ${t.category}`}
      searchable
      selectable={false}
      maxHeight={null}
      searchPlaceholder="Search room, issue, assignee"
      searchText={(t) => `${t.room?.room_number ?? ""} ${t.description ?? ""} ${t.assigned_to?.full_name ?? ""}`}
      defaultSort={{ key: "created_at", dir: "desc" }}
      pageSize={pageSize}
      density="comfortable"
      onRowClick={onRowClick}
      emptyState={<EmptyState icon={<ClipboardList />} title={emptyTitle} description={emptyDescription} />}
      ariaLabel={ariaLabel}
    />
  );
});
