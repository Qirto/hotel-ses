"use client";

import { memo, type ReactNode } from "react";
import { CircleCheck, Siren } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/features/Panel";
import { TicketCard } from "@/components/features/RoomDetail";

/** Dashboard list of urgent open tickets, with a link to the Tickets tab. */
export const UrgentTicketsPanel = memo(function UrgentTicketsPanel({
  title,
  description,
  tickets,
  actions,
  onViewAll,
}: {
  title: string;
  description: string;
  tickets: readonly Reclamation[];
  actions?: (ticket: Reclamation) => ReactNode;
  onViewAll: () => void;
}) {
  return (
    <Panel
      title={title}
      description={description}
      icon={<Siren />}
      actions={
        <Button size="touch" variant="ghost" onClick={onViewAll}>
          View all
        </Button>
      }
    >
      {tickets.length === 0 ? (
        <EmptyState icon={<CircleCheck />} title="Nothing urgent" description="No emergency or high-priority tickets are open." />
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} actions={actions?.(t)} />
          ))}
        </ul>
      )}
    </Panel>
  );
});
