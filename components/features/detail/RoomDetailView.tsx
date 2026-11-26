"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { RoomDetail } from "@/components/features/RoomDetail";
import { RoomLogForms } from "@/components/features/room/RoomLogForms";
import { useTicketActions } from "@/components/features/TicketActions";
import { useHotelState } from "@/hooks/useHotelState";
import { useRoomControls } from "@/hooks/useRoomControls";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { can } from "@/lib/permissions";
import { ROLE_LABEL, type Role } from "@/lib/roles";

/**
 * One room at /rooms/<number>: a modal over the current page (`frame="sheet"`, closed
 * with Back) or a full page after a refresh or from a link. Every control follows the
 * role's permissions.
 */
export function RoomDetailView({ role, room, tickets, frame }: { role: Role; room: HotelRoom; tickets: Reclamation[]; frame: "sheet" | "page" }) {
  const router = useRouter();
  const p = useHotelState({ rooms: useMemo(() => [room], [room]), reclamations: tickets, selectedRoomId: room.id });
  const mutations = useTicketMutations(p, ROLE_LABEL[role]);
  const controls = useRoomControls(p, { stay: can(role, "rooms.stay"), cleaning: can(role, "rooms.cleaning") });
  const ticketActions = useTicketActions({
    pending: p.isPending,
    onAcknowledge: can(role, "requests.acknowledge") ? mutations.acknowledge : undefined,
    onResolve: can(role, "requests.resolve") ? mutations.resolve : undefined,
  });
  const close = () => (frame === "sheet" ? router.back() : router.push("/rooms"));

  return (
    <RoomDetail
      frame={frame}
      room={p.selectedRoom}
      tickets={p.tickets}
      onClose={close}
      controls={controls ?? undefined}
      ticketActions={ticketActions}
      logForm={
        can(role, "requests.create") ? (
          <RoomLogForms mode={p.logMode} onModeChange={p.setLogMode} onCreate={mutations.createInSelectedRoom} onRecordPast={mutations.recordInSelectedRoom} pending={p.isPending} />
        ) : undefined
      }
    />
  );
}
