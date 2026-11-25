"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import { Building2, ClipboardList, ListFilter } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { Panel } from "@/components/features/Panel";
import { FilterBar, PillGroup, SelectField } from "@/components/features/Filters";
import { TicketTable } from "@/components/features/TicketTable";
import { countOpenTickets, DATE_RANGES, inDateRange, TICKET_STATUS_OPTIONS, type DateRange, type TicketStatusFilter } from "@/lib/tickets";
import { departmentLabel, plural } from "@/lib/format";

/**
 * Tickets tab shared by every portal: department (with counts), status and
 * date-range filters over `TicketTable`. Text search is the table's own.
 */
export const TicketsView = memo(function TicketsView({
  tickets,
  actions,
  departments,
  departmentName = departmentLabel,
}: {
  tickets: readonly Reclamation[];
  /** Per-ticket buttons (see `useTicketActions`); omit for a read-only list. */
  actions?: (ticket: Reclamation) => ReactNode;
  /** Department codes to list even with no tickets. */
  departments?: readonly string[];
  /** Label for a department code. Must be stable. */
  departmentName?: (code: string) => string;
}) {
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState<TicketStatusFilter>("ALL");
  const [range, setRange] = useState<DateRange>("ALL");

  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);

  const departmentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tickets) if (t.department) counts.set(t.department, (counts.get(t.department) ?? 0) + 1);
    for (const code of departments ?? []) if (!counts.has(code)) counts.set(code, 0);
    return [
      { value: "ALL", label: `All departments (${tickets.length})` },
      ...[...counts.entries()]
        .map(([code, n]) => ({ value: code, name: departmentName(code), n }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ value: d.value, label: `${d.name} (${d.n})` })),
    ];
  }, [tickets, departments, departmentName]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return tickets.filter(
      (t) => (department === "ALL" || t.department === department) && (status === "ALL" || t.status === status) && inDateRange(t, range, now)
    );
  }, [tickets, department, status, range]);

  return (
    <Panel title="Tickets" description={`${plural(filtered.length, "ticket")} · ${openCount} open`} icon={<ClipboardList />}>
      <div className="mb-4 flex flex-col gap-3">
        <FilterBar>
          <SelectField label="Department" icon={<Building2 />} value={department} onChange={setDepartment} options={departmentOptions} />
          <SelectField label="Status" icon={<ListFilter />} value={status} onChange={setStatus} options={TICKET_STATUS_OPTIONS} />
        </FilterBar>
        <PillGroup<DateRange> label="Date range" value={range} onChange={setRange} options={DATE_RANGES} />
      </div>
      <TicketTable tickets={filtered} actions={actions} />
    </Panel>
  );
});
