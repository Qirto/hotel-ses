"use client";

import { useCallback } from "react";
import type { HotelRoom } from "@/utils/roomsData";
import type { Flash } from "@/components/app/notice";
import { CLEANING_LABEL, NEXT_CLEANING } from "@/lib/rooms";
import { cycleRoomCleaning } from "@/app/actions";

/** Handler for `HousekeepingControl`: moves a room to its next cleaning state, optimistically. */
export function useCleaningCycle({
  run,
  patchRoom,
  flash,
}: {
  run: (action: () => Promise<void>) => void;
  patchRoom: (id: number, patch: Partial<HotelRoom>) => void;
  flash: Flash;
}) {
  return useCallback(
    (room: HotelRoom) => {
      const next = NEXT_CLEANING[room.cleaning_status] ?? "DIRTY";
      run(async () => {
        const res = await cycleRoomCleaning(room.id, next);
        if (res.success) {
          patchRoom(room.id, { cleaning_status: next });
          flash("success", `Chambre ${room.room_number} : ${CLEANING_LABEL[next].toLowerCase()}.`);
        } else flash("danger", "Impossible de mettre à jour l’état de nettoyage.");
      });
    },
    [run, patchRoom, flash]
  );
}
