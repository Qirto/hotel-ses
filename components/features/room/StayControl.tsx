"use client";

import { memo, type ReactNode } from "react";
import { LogIn, LogOut } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import type { StayState } from "@/lib/rooms";

const STAY_ACTIONS: { state: StayState; label: string; icon: ReactNode }[] = [
  { state: "OCCUPIED", label: "Check in", icon: <LogIn className="size-4" aria-hidden /> },
  { state: "VACANT_DIRTY", label: "Check out", icon: <LogOut className="size-4" aria-hidden /> },
];

/** Room detail control: check a guest in or out. */
export const StayControl = memo(function StayControl({
  room,
  pending,
  onChange,
}: {
  room: HotelRoom;
  pending: boolean;
  onChange: (room: HotelRoom, state: StayState) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Stay</p>
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
    </section>
  );
});
