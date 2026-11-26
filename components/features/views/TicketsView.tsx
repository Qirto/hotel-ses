"use client";

import type { TicketActionsRender } from "@/components/features/TicketActions";
import { memo, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { Panel } from "@/components/features/Panel";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { TicketTable } from "@/components/features/TicketTable";
import { countOpenTickets, DATE_RANGES, inDateRange, matchesTicketQuery, TICKET_STATUS_OPTIONS, type DateRange, type TicketStatusFilter } from "@/lib/tickets";
import { departmentLabel, plural } from "@/lib/format";
import { useUrlFilters } from "@/hooks/useUrlFilters";

const REQUEST_FILTERS = { q: "", service: "ALL", status: "ALL", range: "ALL" };

/**
 * The requests list: service (with counts), status and date-range filters and the
 * text search, in one toolbar over `TicketTable`.
 */
export const TicketsView = memo(function TicketsView({
  tickets,
  actions,
  departments,
  departmentName = departmentLabel,
  onOpenTicket,
  canEdit = false,
}: {
  tickets: readonly Reclamation[];
  /** Per-ticket buttons (see `useTicketActions`); omit for a read-only list. */
  actions?: TicketActionsRender;
  /** Department codes to list even with no tickets. */
  departments?: readonly string[];
  /** Label for a department code. Must be stable. */
  departmentName?: (code: string) => string;
  /** Row click opens the request (its detail page or modal). Must be stable. */
  onOpenTicket?: (ticket: Reclamation) => void;
  /** Adds the pencil (edit) button to each row; the detail is then editable. */
  canEdit?: boolean;
}) {
  // Filters live in the URL (`/requests?status=OPEN&service=TECHNICAL`): refresh, Back and links keep them.
  const [filters, setFilters] = useUrlFilters(REQUEST_FILTERS);
  const department = filters.service;
  const setDepartment = (value: string) => setFilters({ service: value });
  const status = filters.status as TicketStatusFilter;
  const setStatus = (value: TicketStatusFilter) => setFilters({ status: value });
  const range = filters.range as DateRange;
  const setRange = (value: DateRange) => setFilters({ range: value });
  const query = filters.q;
  const setQuery = (value: string) => setFilters({ q: value });

  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);

  const departmentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tickets) if (t.department) counts.set(t.department, (counts.get(t.department) ?? 0) + 1);
    for (const code of departments ?? []) if (!counts.has(code)) counts.set(code, 0);
    return [
      { value: "ALL", label: `Tous les services (${tickets.length})` },
      ...[...counts.entries()]
        .map(([code, n]) => ({ value: code, name: departmentName(code), n }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ value: d.value, label: `${d.name} (${d.n})` })),
    ];
  }, [tickets, departments, departmentName]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return tickets.filter(
      (t) =>
        (department === "ALL" || t.department === department) &&
        (status === "ALL" || t.status === status) &&
        inDateRange(t, range, now) &&
        matchesTicketQuery(t, query)
    );
  }, [tickets, department, status, range, query]);

  return (
    <Panel title="Demandes" description={`${plural(filtered.length, "demande")} · ${plural(openCount, "ouverte")}`} icon={<ClipboardList />}>
      <FilterBar className="mb-4">
        <SearchInput label="Rechercher une demande par chambre, problème ou personne assignée" placeholder="Rechercher une demande" value={query} onChange={setQuery} />
        <SelectField label="Service" value={department} onChange={setDepartment} options={departmentOptions} />
        <SelectField label="Statut" value={status} onChange={setStatus} options={TICKET_STATUS_OPTIONS} />
        <SelectField<DateRange> label="Période" value={range} onChange={setRange} options={DATE_RANGES} />
      </FilterBar>
      <TicketTable tickets={filtered} actions={actions} onRowClick={onOpenTicket} onEdit={canEdit ? onOpenTicket : undefined} />
    </Panel>
  );
});
