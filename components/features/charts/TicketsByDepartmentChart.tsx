"use client";

import { memo, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { EmptyState } from "@/components/features/Panel";
import { ticketsByDepartment } from "@/lib/tickets";
import { RankedBreakdown, type Series } from "./Breakdown";

const SERIES: Series[] = [
  { key: "open", label: "Ouvertes", color: "var(--warning)" },
  { key: "resolved", label: "Résolues", color: "var(--success)" },
];

/** Open / resolved tickets for every department, busiest first. */
export const TicketsByDepartmentChart = memo(function TicketsByDepartmentChart({ tickets }: { tickets: readonly Reclamation[] }) {
  const rows = useMemo(
    () => ticketsByDepartment(tickets, Infinity).map((d) => ({ label: d.label, values: { open: d.open, resolved: d.resolved } })),
    [tickets]
  );
  if (rows.length === 0) return <EmptyState icon={<ClipboardList />} title="Aucune demande pour le moment" />;
  return <RankedBreakdown rows={rows} series={SERIES} label="Demandes par service" unit={["demande", "demandes"]} />;
});
