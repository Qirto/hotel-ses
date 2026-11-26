"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { CircleCheck, Eye } from "lucide-react";
import type { Reclamation } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { isOpenTicket } from "@/lib/tickets";

export interface TicketActionHandlers {
  pending: boolean;
  /** Shown on OPEN tickets only. */
  onAcknowledge?: (id: number) => void;
  /** Shown on every open (unresolved) ticket. */
  onResolve?: (id: number) => void;
}

/** Acknowledge / resolve buttons for one ticket, or null when there is nothing to do. */
export function ticketActions(ticket: Reclamation, { pending, onAcknowledge, onResolve }: TicketActionHandlers): ReactNode {
  if (!isOpenTicket(ticket)) return null;
  const acknowledge = onAcknowledge && ticket.status === "OPEN";
  if (!acknowledge && !onResolve) return null;
  return (
    <>
      {acknowledge && (
        <Button size="touch" variant="secondary" onClick={() => onAcknowledge(ticket.id)} disabled={pending} leftIcon={<Eye className="size-4" aria-hidden />}>
          Prendre en charge
        </Button>
      )}
      {onResolve && (
        <Button size="touch" variant="success" onClick={() => onResolve(ticket.id)} disabled={pending} aria-label="Marquer comme résolue" leftIcon={<CircleCheck className="size-4" aria-hidden />}>
          Résolue
        </Button>
      )}
    </>
  );
}

/** Per-ticket action buttons, plus how many buttons a ticket can show at most (for column sizing). */
export type TicketActionsRender = ((ticket: Reclamation) => ReactNode) & { maxButtons: number };

/**
 * Stable render prop for `TicketTable`, `TicketCard` and `RoomDetail`.
 * Pass the portal's handlers; omit both to get `undefined` (no action column).
 */
export function useTicketActions({ pending, onAcknowledge, onResolve }: TicketActionHandlers): TicketActionsRender | undefined {
  const maxButtons = (onAcknowledge ? 1 : 0) + (onResolve ? 1 : 0);
  const render = useCallback(
    (ticket: Reclamation) => ticketActions(ticket, { pending, onAcknowledge, onResolve }),
    [pending, onAcknowledge, onResolve]
  );
  return useMemo(() => (maxButtons ? Object.assign(render, { maxButtons }) : undefined), [render, maxButtons]);
}
