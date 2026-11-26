"use client";

import { memo } from "react";
import { NewTicketForm, PastIncidentForm, Segmented, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";

export type RoomLogMode = "NEW" | "PAST";

/**
 * "Log issue" view of the room detail: a New ticket / Past incident switch
 * over the two forms. The mode is controlled by the caller (`useHotelState`)
 * so it survives switching detail tabs and rooms.
 */
export const RoomLogForms = memo(function RoomLogForms({
  mode,
  onModeChange,
  onCreate,
  onRecordPast,
  pending,
}: {
  mode: RoomLogMode;
  onModeChange: (mode: RoomLogMode) => void;
  onCreate: (input: NewTicketInput) => Promise<boolean> | boolean;
  onRecordPast: (input: PastIncidentInput) => Promise<boolean> | boolean;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Type"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "NEW", label: "Nouvelle demande" },
          { value: "PAST", label: "Incident passé" },
        ]}
      />
      {mode === "NEW" ? (
        <NewTicketForm onSubmit={onCreate} pending={pending} />
      ) : (
        <PastIncidentForm onSubmit={onRecordPast} pending={pending} />
      )}
    </div>
  );
});
