"use client";

import { ControlSection } from "./ControlSection";
import { memo, type ReactNode } from "react";
import { LogIn, LogOut, Minus, Plus } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import type { StayState } from "@/lib/rooms";

const STAY_ACTIONS: { state: StayState; label: string; icon: ReactNode }[] = [
  { state: "OCCUPIED", label: "Enregistrer l’arrivée", icon: <LogIn className="size-4" aria-hidden /> },
  { state: "VACANT_DIRTY", label: "Enregistrer le départ", icon: <LogOut className="size-4" aria-hidden /> },
];

/** − value + stepper for a guest count. */
function GuestStepper({ label, value, min, disabled, onChange }: { label: string; value: number; min: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-1.5">
      <span className="text-sm text-fg-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="flex-none" aria-label={`${label} : un de moins`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
          <Minus className="size-3.5" aria-hidden />
        </Button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button type="button" variant="ghost" size="sm" className="flex-none" aria-label={`${label} : un de plus`} disabled={disabled || value >= 9} onClick={() => onChange(value + 1)}>
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** Room detail control: check a guest in or out, and (occupied) correct the guest count. */
export const StayControl = memo(function StayControl({
  room,
  pending,
  onChange,
  onHeadcount,
}: {
  room: HotelRoom;
  pending: boolean;
  onChange: (room: HotelRoom, state: StayState) => void;
  onHeadcount?: (room: HotelRoom, adults: number, children: number) => void;
}) {
  const adults = room.adult_count ?? 0;
  const children = room.child_count ?? 0;
  return (
    <ControlSection title="Séjour">
      {room.is_occupied && onHeadcount && (
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <GuestStepper label="Adultes" value={adults} min={1} disabled={pending} onChange={(n) => onHeadcount(room, n, children)} />
          <GuestStepper label="Enfants" value={children} min={0} disabled={pending} onChange={(n) => onHeadcount(room, adults, n)} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {STAY_ACTIONS.map((a) => (
          <Button
            key={a.state}
            variant="secondary"
            size="touch"
            onClick={() => onChange(room, a.state)}
            disabled={pending}
            leftIcon={a.icon}
            className="justify-center"
          >
            {a.label}
          </Button>
        ))}
      </div>
    </ControlSection>
  );
});
