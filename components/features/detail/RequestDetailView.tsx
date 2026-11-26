"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Reclamation, Staff } from "@/utils/roomsData";
import { TicketEditSheet } from "@/components/features/TicketEditSheet";
import { useHotelState } from "@/hooks/useHotelState";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { can } from "@/lib/permissions";
import { ROLE_LABEL, type Role } from "@/lib/roles";

const NO_ROOMS: never[] = [];

/**
 * One request at /requests/<id>: a modal over the list (`frame="sheet"`, closed with
 * Back) or a full page after a refresh or from a link. Editable with `requests.edit`,
 * read-only otherwise.
 */
export function RequestDetailView({ role, ticket, staff, frame }: { role: Role; ticket: Reclamation; staff: Staff[]; frame: "sheet" | "page" }) {
  const router = useRouter();
  const p = useHotelState({ rooms: NO_ROOMS, reclamations: useMemo(() => [ticket], [ticket]) });
  const { editTicket, deleteTicket } = useTicketMutations(p, ROLE_LABEL[role]);
  const close = () => (frame === "sheet" ? router.back() : router.push("/requests"));

  return (
    <TicketEditSheet
      key={ticket.id}
      frame={frame}
      ticket={ticket}
      open
      onOpenChange={(open) => !open && close()}
      staff={staff}
      pending={p.isPending}
      readOnly={!can(role, "requests.edit")}
      onSave={(input, assignee) => {
        editTicket(ticket.id, input, assignee);
        close();
      }}
      onDelete={() => {
        deleteTicket(ticket.id);
        close();
      }}
    />
  );
}
