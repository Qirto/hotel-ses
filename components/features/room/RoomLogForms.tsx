"use client";

import { memo } from "react";
import { NewTicketForm, PastIncidentForm, Segmented, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";

export type RoomLogMode = "NEW" | "PAST";

/**
 * "Log issue" tab of the room detail: a New ticket / Past incident switch
 * over the two forms. The mode is controlled by the portal (`usePortalState`)
 * so it survives switching detail tabs and rooms.
 */
export const RoomLogForms = memo(function RoomLogForms({
  mode,
  onModeChange,
  onCreate,
  onRecordPast,
  pending,
  newLabel = "New ticket",
  submitLabel,
}: {
  mode: RoomLogMode;
  onModeChange: (mode: RoomLogMode) => void;
  onCreate: (input: NewTicketInput) => Promise<boolean> | boolean;
  onRecordPast: (input: PastIncidentInput) => Promise<boolean> | boolean;
  pending: boolean;
  /** Label of the "new" choice. */
  newLabel?: string;
  /** Submit label of the new ticket form (form default when omitted). */
  submitLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Type"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "NEW", label: newLabel },
          { value: "PAST", label: "Past incident" },
        ]}
      />
      {mode === "NEW" ? (
        <NewTicketForm onSubmit={onCreate} pending={pending} submitLabel={submitLabel} />
      ) : (
        <PastIncidentForm onSubmit={onRecordPast} pending={pending} />
      )}
    </div>
  );
});
