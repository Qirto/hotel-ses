"use client";

import { memo, useMemo } from "react";
import { BedDouble } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { blockLabel, roomHeadline, roomLayout, ticketStatsByRoom, type RoomBlock, type RoomTicketStats, type Tone } from "@/lib/rooms";
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
 * Room plan shared by every portal, laid out as the hotel is built: each floor shows
 * its blocks side by side (stacked on narrow screens), and each block its two corridor
 * sides (even numbers left, odd right) in number order. Off-screen floors use
 * content-visibility, so they cost nothing to render.
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
  const floors = useMemo(() => roomLayout(rooms), [rooms]);

  if (rooms.length === 0) {
    return <EmptyState icon={<BedDouble />} title="Aucune chambre ne correspond" description="Essayez un autre étage, un autre bloc ou une autre recherche." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted" aria-label="Légende">
        {LEGEND.map((l) => (
          <li key={l.tone} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", DOT[l.tone])} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
      {floors.map((f) => (
        <section key={f.floor} className="[contain-intrinsic-size:auto_640px] [content-visibility:auto]" aria-label={`Étage ${f.floor}`}>
          <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
            Étage {f.floor}
            <span className="text-xs font-normal text-fg-muted">{plural(f.rooms.length, "chambre")}</span>
          </h3>
          {/* one block fills the row; two sit side by side once each has ~34rem */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,34rem),1fr))] gap-3">
            {f.blocks.map((b) => (
              <BlockCard key={b.block} block={b} stats={stats} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});

const BlockCard = memo(function BlockCard({
  block,
  stats,
  onSelect,
}: {
  block: RoomBlock;
  stats: Map<number, RoomTicketStats>;
  onSelect: (room: HotelRoom) => void;
}) {
  const attention = block.rooms.filter((r) => {
    const tone = roomHeadline(r, stats.get(r.id)).tone;
    return tone === "danger" || tone === "warning";
  }).length;
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface-raised p-3 md:p-4" aria-label={block.label} role="group">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold">{block.label}</h4>
        <p className="text-xs text-fg-muted">
          {plural(block.rooms.length, "chambre")}
          {attention > 0 && <span className="text-warning"> · {attention} à traiter</span>}
        </p>
      </div>
      {block.sides.map((side, i) => (
        <div key={side.side}>
          {i > 0 && (
            <div className="my-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-subtle" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              Couloir
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs text-fg-muted">
            <span className="font-medium text-fg-secondary">{side.label}</span>
            <span className="tabular-nums">
              {side.from} – {side.to}
            </span>
            <span>· {plural(side.rooms.length, "chambre")}</span>
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-1.5" aria-label={`${block.label}, ${side.label}`}>
            {side.rooms.map((room) => (
              <li key={room.id}>
                <RoomTile room={room} stats={stats.get(room.id)} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </div>
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
        "focus-ring group flex h-full w-full flex-col gap-1 rounded-lg border bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface-hover",
        head.tone === "danger" ? "border-danger/50" : head.tone === "warning" ? "border-warning/40" : "border-border hover:border-border-hover"
      )}
      aria-label={`Chambre ${room.room_number}, ${head.label}, ${room.is_occupied ? "occupée" : "libre"}, ${blockLabel(room.block)}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold tabular-nums tracking-tight">{room.room_number}</span>
        <span className={cn("size-2 shrink-0 rounded-full", DOT[head.tone])} aria-hidden />
      </span>
      <span className="line-clamp-2 text-xs leading-snug text-fg-muted">{head.label}</span>
    </button>
  );
});
