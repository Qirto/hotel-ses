"use client";

import type { ReactNode } from "react";
import type { Reclamation } from "@/utils/roomsData";
import type { PortalState } from "@/hooks/usePortalState";
import type { useTicketMutations } from "@/hooks/useTicketMutations";
import { RoomDetail } from "./RoomDetail";
import { RoomLogForms } from "./room/RoomLogForms";

/**
 * The room detail sheet as every portal wires it: selected room and tickets from
 * the portal state, the log forms bound to the shared ticket mutations. Portals
 * only add what differs: the room controls and per-ticket actions.
 */
export function PortalRoomDetail<Tab extends string>({
  p,
  tickets,
  controls,
  ticketActions,
}: {
  p: PortalState<Tab>;
  tickets: ReturnType<typeof useTicketMutations>;
  controls?: ReactNode;
  ticketActions?: (ticket: Reclamation) => ReactNode;
}) {
  return (
    <RoomDetail
      room={p.selectedRoom}
      tickets={p.tickets}
      onClose={p.closeRoom}
      controls={controls}
      ticketActions={ticketActions}
      logForm={
        <RoomLogForms
          mode={p.logMode}
          onModeChange={p.setLogMode}
          onCreate={tickets.createInSelectedRoom}
          onRecordPast={tickets.recordInSelectedRoom}
          pending={p.isPending}
        />
      }
    />
  );
}
