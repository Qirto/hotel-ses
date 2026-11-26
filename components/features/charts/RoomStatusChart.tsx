"use client";

import { memo, useMemo } from "react";
import { BedDouble } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { EmptyState, Panel } from "@/components/features/Panel";
import { roomStatusCounts } from "@/lib/rooms";
import { SplitBreakdown } from "./Breakdown";

/** Where every room stands: an exact partition (occupied, ready, dirty, in cleaning). */
export const RoomStatusChart = memo(function RoomStatusChart({ rooms }: { rooms: readonly HotelRoom[] }) {
  const parts = useMemo(() => {
    const c = roomStatusCounts(rooms);
    return [
      { key: "ready", label: "Ready", value: c.vacantClean, color: "var(--success)" },
      { key: "occupied", label: "Occupied", value: c.occupied, color: "var(--info)" },
      { key: "cleaning", label: "In cleaning", value: Math.max(0, c.inCleaning), color: "var(--warning)" },
      { key: "dirty", label: "Dirty", value: c.vacantDirty, color: "var(--danger)" },
    ];
  }, [rooms]);

  if (rooms.length === 0) return <EmptyState icon={<BedDouble />} title="No rooms loaded" />;
  return <SplitBreakdown parts={parts} label="Room status" unit={["room", "rooms"]} />;
});

/** The "Room status" card, as shown on Reception Stats and the GM dashboard. */
export function RoomStatusPanel({ rooms }: { rooms: readonly HotelRoom[] }) {
  return (
    // fills the card when a taller neighbour stretches it, content centred vertically
    <Panel title="Room status" description="Where all rooms stand right now" icon={<BedDouble />} className="flex flex-col" bodyClassName="flex flex-1 items-center">
      <RoomStatusChart rooms={rooms} />
    </Panel>
  );
}
