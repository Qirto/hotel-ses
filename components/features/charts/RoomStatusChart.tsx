"use client";

import { memo, useMemo } from "react";
import { BedDouble } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/features/Panel";
import { roomStatusCounts } from "@/lib/rooms";

/** Donut of where every room stands: an exact partition (occupied, ready, dirty, in cleaning). */
export const RoomStatusChart = memo(function RoomStatusChart({ rooms, size = 200 }: { rooms: readonly HotelRoom[]; size?: number }) {
  const data = useMemo(() => {
    const c = roomStatusCounts(rooms);
    return [
      { label: "Occupied", value: c.occupied, color: "var(--text-primary)" },
      { label: "Ready", value: c.vacantClean, color: "var(--success)" },
      { label: "Dirty", value: c.vacantDirty, color: "var(--danger)" },
      { label: "In cleaning", value: Math.max(0, c.inCleaning), color: "var(--warning)" },
    ];
  }, [rooms]);

  if (rooms.length === 0) return <EmptyState icon={<BedDouble />} title="No rooms loaded" />;
  return <DonutChart data={data} centerLabel="Rooms" size={size} ariaLabel="Room status breakdown" />;
});
