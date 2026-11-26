"use client";

import type { TicketActionsRender } from "@/components/features/TicketActions";
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
  onOpenTicket,
}: {
  title: string;
  description: string;
  tickets: readonly Reclamation[];
  actions?: TicketActionsRender;
  onViewAll: () => void;
  /** Opens the request editor. */
  onOpenTicket?: (ticket: Reclamation) => void;
}) {
  return (
    <Panel
      title={title}
      description={description}
      icon={<Siren />}
      actions={
        <Button size="touch" variant="ghost" onClick={onViewAll}>
          Tout afficher
        </Button>
      }
    >
      {tickets.length === 0 ? (
        <EmptyState icon={<CircleCheck />} title="Rien d’urgent" description="Aucune demande urgente ou de priorité haute n’est ouverte." />
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} actions={actions?.(t)} onEdit={onOpenTicket} />
          ))}
        </ul>
      )}
    </Panel>
  );
});
