"use client";

import { useCallback } from "react";
import type { HotelRoom } from "@/utils/roomsData";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { StayControl } from "@/components/features/room/StayControl";
import { updateRoomHeadcount, updateRoomStayState } from "@/app/actions";
import { STAY_MESSAGE, STAY_RESULT, type StayState } from "@/lib/rooms";
import { useCleaningCycle } from "./useCleaningCycle";
import type { PortalState } from "./usePortalState";

/**
 * The front-desk room controls (check-in / out, guest count, housekeeping) for the
 * open room detail. Shared by the Reception and Administration portals; pass the
 * result as PortalRoomDetail's `controls`.
 */
export function useRoomControls<Tab extends string>(p: PortalState<Tab>) {
  const { run, patchRoom, flash, isPending, selectedRoom } = p;
  const cycleCleaning = useCleaningCycle(p);

  const setStayState = useCallback(
    (room: HotelRoom, state: StayState) =>
      run(async () => {
        const res = await updateRoomStayState(room.id, state);
        if (res.success) {
          patchRoom(room.id, STAY_RESULT[state]);
          flash("success", `Chambre ${room.room_number} : ${STAY_MESSAGE[state]}.`);
        } else flash("danger", "Impossible de mettre à jour le statut du séjour.");
      }),
    [run, patchRoom, flash]
  );

  // Guest count: shown at once, put back if the server refuses.
  const setHeadcount = useCallback(
    (room: HotelRoom, adults: number, children: number) =>
      run(async () => {
        const before = { adult_count: room.adult_count, child_count: room.child_count };
        patchRoom(room.id, { adult_count: adults, child_count: children });
        const res = await updateRoomHeadcount(room.id, adults, children);
        if (!res.success) {
          patchRoom(room.id, before);
          flash("danger", `Impossible de mettre à jour le nombre de clients de la chambre ${room.room_number}.`);
        }
      }),
    [run, patchRoom, flash]
  );

  return (
    selectedRoom && (
      <div className="flex flex-col gap-4">
        <StayControl room={selectedRoom} pending={isPending} onChange={setStayState} onHeadcount={setHeadcount} />
        <HousekeepingControl room={selectedRoom} pending={isPending} onCycle={cycleCleaning} />
      </div>
    )
  );
}
