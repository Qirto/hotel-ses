"use client";

import { memo, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { BarChart } from "@/components/ui/bar-chart";
import { EmptyState } from "@/components/features/Panel";
import { ticketsByDepartment } from "@/lib/tickets";

const SERIES = [
  { key: "open", label: "Open", color: "var(--danger)" },
  { key: "resolved", label: "Resolved", color: "var(--success)" },
];

/** Stacked open / resolved bars for the six busiest departments. */
export const TicketsByDepartmentChart = memo(function TicketsByDepartmentChart({
  tickets,
  height = 220,
}: {
  tickets: readonly Reclamation[];
  height?: number;
}) {
  const data = useMemo(() => ticketsByDepartment(tickets), [tickets]);
  if (data.length === 0) return <EmptyState icon={<ClipboardList />} title="No tickets yet" />;
  return <BarChart data={data} series={SERIES} variant="stacked" height={height} ariaLabel="Tickets by department" />;
});
