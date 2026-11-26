"use client";

import { ControlSection } from "./ControlSection";
import { memo } from "react";
import type { HotelRoom } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { CLEANING_LABEL, NEXT_CLEANING } from "@/lib/rooms";

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
    <ControlSection title="Housekeeping">
      <p className="text-sm text-fg-muted">
        Currently {CLEANING_LABEL[room.cleaning_status].toLowerCase()}. Next step: {next}.
      </p>
      <Button
        variant="secondary"
        size="touch"
        onClick={() => onCycle(room)}
        isLoading={pending}
        loadingText="Updating"
        className="mt-1 w-full justify-center sm:w-auto"
      >
        Mark as {next}
      </Button>
    </ControlSection>
  );
});
