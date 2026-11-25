"use client";

import { useCallback, type ReactNode } from "react";
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
          Acknowledge
        </Button>
      )}
      {onResolve && (
        <Button size="touch" variant="success" onClick={() => onResolve(ticket.id)} disabled={pending} leftIcon={<CircleCheck className="size-4" aria-hidden />}>
          Resolve
        </Button>
      )}
    </>
  );
}

/**
 * Stable render prop for `TicketTable`, `TicketCard` and `RoomDetail`.
 * Pass the portal's handlers; omit both to get `undefined` (no action column).
 */
export function useTicketActions({ pending, onAcknowledge, onResolve }: TicketActionHandlers) {
  const render = useCallback(
    (ticket: Reclamation) => ticketActions(ticket, { pending, onAcknowledge, onResolve }),
    [pending, onAcknowledge, onResolve]
  );
  return onAcknowledge || onResolve ? render : undefined;
}
