"use client";

import { ControlSection } from "./ControlSection";
import { memo } from "react";
import type { HotelRoom } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { CLEANING_LABEL, NEXT_CLEANING } from "@/lib/rooms";

/** Button label per target cleaning status (codes unchanged). */
const CLEANING_ACTION: Record<HotelRoom["cleaning_status"], string> = {
  DIRTY: "Marquer à nettoyer",
  CLEANING: "Passer en nettoyage",
  INSPECTING: "Passer en contrôle",
  CLEAN: "Marquer comme propre",
};

/** Room detail control: advance the room one step in the cleaning cycle. */
export const HousekeepingControl = memo(function HousekeepingControl({
  room,
  pending,
  onCycle,
}: {
  room: HotelRoom;
  pending: boolean;
  onCycle: (room: HotelRoom) => void;
}) {
  const next = CLEANING_LABEL[NEXT_CLEANING[room.cleaning_status]].toLowerCase();
  return (
    <ControlSection title="Gouvernance">
      <p className="text-sm text-fg-muted">
        Actuellement : {CLEANING_LABEL[room.cleaning_status].toLowerCase()}. Étape suivante : {next}.
      </p>
      <Button
        variant="secondary"
        size="touch"
        onClick={() => onCycle(room)}
        isLoading={pending}
        loadingText="Mise à jour"
        className="mt-1 w-full justify-center sm:w-auto"
      >
        {CLEANING_ACTION[NEXT_CLEANING[room.cleaning_status]]}
      </Button>
    </ControlSection>
  );
});
