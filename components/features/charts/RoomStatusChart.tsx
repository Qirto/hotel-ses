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
      { key: "ready", label: "Prêtes", value: c.vacantClean, color: "var(--success)" },
      { key: "occupied", label: "Occupées", value: c.occupied, color: "var(--info)" },
      { key: "cleaning", label: "En nettoyage", value: Math.max(0, c.inCleaning), color: "var(--warning)" },
      { key: "dirty", label: "À nettoyer", value: c.vacantDirty, color: "var(--danger)" },
    ];
  }, [rooms]);

  if (rooms.length === 0) return <EmptyState icon={<BedDouble />} title="Aucune chambre chargée" />;
  return <SplitBreakdown parts={parts} label="État des chambres" unit={["chambre", "chambres"]} />;
});

/** The "Room status" card, as shown on Reception Stats and the GM dashboard. */
export function RoomStatusPanel({ rooms }: { rooms: readonly HotelRoom[] }) {
  return (
    // fills the card when a taller neighbour stretches it, content centred vertically
    <Panel title="État des chambres" description="Situation actuelle de toutes les chambres" icon={<BedDouble />} className="flex flex-col" bodyClassName="flex flex-1 items-center">
      <RoomStatusChart rooms={rooms} />
    </Panel>
  );
}
