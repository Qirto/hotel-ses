"use client";

import type { TicketActionsRender } from "@/components/features/TicketActions";
import { memo, useMemo, useState, type ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { Panel } from "@/components/features/Panel";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { TicketTable } from "@/components/features/TicketTable";
import { countOpenTickets, DATE_RANGES, inDateRange, matchesTicketQuery, TICKET_STATUS_OPTIONS, type DateRange, type TicketStatusFilter } from "@/lib/tickets";
import { departmentLabel, plural } from "@/lib/format";

/**
 * Tickets tab shared by every portal: department (with counts), status and
 * date-range filters and the text search, all in one toolbar over `TicketTable`.
 */
export const TicketsView = memo(function TicketsView({
  tickets,
  actions,
  departments,
  departmentName = departmentLabel,
  onOpenTicket,
}: {
  tickets: readonly Reclamation[];
  /** Per-ticket buttons (see `useTicketActions`); omit for a read-only list. */
  actions?: TicketActionsRender;
  /** Department codes to list even with no tickets. */
  departments?: readonly string[];
  /** Label for a department code. Must be stable. */
  departmentName?: (code: string) => string;
  /** Row click opens the request editor (omit for a read-only list). Must be stable. */
  onOpenTicket?: (ticket: Reclamation) => void;
}) {
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState<TicketStatusFilter>("ALL");
  const [range, setRange] = useState<DateRange>("ALL");
  const [query, setQuery] = useState("");

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
      <TicketTable tickets={filtered} actions={actions} onRowClick={onOpenTicket} onEdit={onOpenTicket} />
    </Panel>
  );
});
