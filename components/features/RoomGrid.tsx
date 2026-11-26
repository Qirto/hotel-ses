"use client";

import { memo, useMemo } from "react";
import { BedDouble } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { blockLabel, roomHeadline, ticketStatsByRoom, type RoomTicketStats, type Tone } from "@/lib/rooms";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "./Panel";

const DOT: Record<Tone, string> = {
  neutral: "bg-fg-subtle",
  info: "bg-fg-muted",
  special: "bg-special",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "success", label: "Prête" },
  { tone: "info", label: "Occupée" },
  { tone: "warning", label: "Demande ouverte / en nettoyage" },
  { tone: "danger", label: "Urgente / à nettoyer" },
];

/**
 * Room matrix shared by every portal. Rooms are grouped by floor; each floor
 * block uses content-visibility so off-screen floors cost nothing to render.
 */
export const RoomGrid = memo(function RoomGrid({
  rooms,
  tickets,
  onSelect,
}: {
  rooms: readonly HotelRoom[];
  tickets: readonly Reclamation[];
  onSelect: (room: HotelRoom) => void;
}) {
  const stats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const floors = useMemo(() => {
    const byFloor = new Map<number, HotelRoom[]>();
    for (const r of rooms) {
      const list = byFloor.get(r.floor) ?? [];
      list.push(r);
      byFloor.set(r.floor, list);
    }
    return [...byFloor.entries()].sort((a, b) => a[0] - b[0]);
  }, [rooms]);

  if (rooms.length === 0) {
    return <EmptyState icon={<BedDouble />} title="Aucune chambre ne correspond" description="Essayez un autre étage, un autre bloc ou une autre recherche." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted" aria-label="Légende">
        {LEGEND.map((l) => (
          <li key={l.tone} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", DOT[l.tone])} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
      {floors.map(([floor, list]) => (
        <section key={floor} className="[contain-intrinsic-size:auto_480px] [content-visibility:auto]" aria-label={`Étage ${floor}`}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
            Étage {floor}
            <span className="text-xs font-normal text-fg-muted">{plural(list.length, "chambre")}</span>
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-2">
            {list.map((room) => (
              <li key={room.id}>
                <RoomTile room={room} stats={stats.get(room.id)} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
});

const RoomTile = memo(function RoomTile({
  room,
  stats,
  onSelect,
}: {
  room: HotelRoom;
  stats?: RoomTicketStats;
  onSelect: (room: HotelRoom) => void;
}) {
  const head = roomHeadline(room, stats);
  return (
    <button
      type="button"
      onClick={() => onSelect(room)}
      className={cn(
        "focus-ring group flex h-full w-full flex-col gap-1 rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-hover",
        head.tone === "danger" ? "border-danger/50" : head.tone === "warning" ? "border-warning/40" : "border-border hover:border-border-hover"
      )}
      aria-label={`Chambre ${room.room_number}, ${head.label}, ${room.is_occupied ? "occupée" : "libre"}, ${blockLabel(room.block)}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold tabular-nums tracking-tight">{room.room_number}</span>
        <span className={cn("size-2 shrink-0 rounded-full", DOT[head.tone])} aria-hidden />
      </span>
      <span className="truncate text-xs text-fg-muted">{head.label}</span>
    </button>
  );
});
