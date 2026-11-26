"use client";

import { useCallback } from "react";
import type { HotelRoom } from "@/utils/roomsData";
import { HousekeepingControl } from "@/components/features/room/HousekeepingControl";
import { StayControl } from "@/components/features/room/StayControl";
import { updateRoomHeadcount, updateRoomStayState } from "@/app/actions";
import { STAY_MESSAGE, STAY_RESULT, type StayState } from "@/lib/rooms";
import { useCleaningCycle } from "./useCleaningCycle";
import type { HotelState } from "./useHotelState";

/**
 * The room controls of the room detail, as the caller's permissions allow: check-in /
 * out and guest count (`stay`), housekeeping cycle (`cleaning`). Null when none apply.
 */
export function useRoomControls(p: HotelState, options: { stay: boolean; cleaning: boolean }) {
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

  if (!selectedRoom || (!options.stay && !options.cleaning)) return null;
  return (
    <div className="flex flex-col gap-4">
      {options.stay && <StayControl room={selectedRoom} pending={isPending} onChange={setStayState} onHeadcount={setHeadcount} />}
      {options.cleaning && <HousekeepingControl room={selectedRoom} pending={isPending} onCycle={cycleCleaning} />}
    </div>
  );
}
