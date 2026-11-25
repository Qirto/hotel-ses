"use client";

import { memo, useMemo, useState } from "react";
import { BedDouble, Building2, ChartColumn, ClipboardList, Clock, Layers, ListFilter, Repeat } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { ProblemBars } from "@/components/features/RoomDetail";
import { ToneBadge } from "@/components/features/StatusBadges";
import { countOpenTickets } from "@/lib/tickets";
import { blockLabel, roomHeadline, ticketStatsByRoom } from "@/lib/rooms";
import { plural } from "@/lib/format";
import { computeAllRoomsAnalytics, type RoomAnalyticsSummary } from "@/utils/roomAnalytics";

type AnalyticsSort = "MOST_TICKETS" | "OPEN_TICKETS" | "RUSH_HOUR" | "ROOM_NUMBER";

const BLOCK_OPTIONS = [
  { value: "ALL", label: "All blocks" },
  { value: "BLOCK_A", label: "Block A" },
  { value: "BLOCK_B", label: "Block B" },
];

const SORT_OPTIONS = [
  { value: "MOST_TICKETS", label: "Most tickets" },
  { value: "OPEN_TICKETS", label: "Most open" },
  { value: "RUSH_HOUR", label: "Biggest rush" },
  { value: "ROOM_NUMBER", label: "Room number" },
] as const satisfies readonly { value: AnalyticsSort; label: string }[];

/**
 * GM analytics tab: peak hours and repeated problems per room. Analytics are
 * computed only while `active`; filters persist across tab switches.
 */
export const AnalyticsView = memo(function AnalyticsView({
  active,
  rooms,
  tickets,
  onOpenRoom,
}: {
  active: boolean;
  rooms: HotelRoom[];
  tickets: Reclamation[];
  onOpenRoom: (room: HotelRoom) => void;
}) {
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState<number | "ALL">("ALL");
  const [block, setBlock] = useState("ALL");
  const [sort, setSort] = useState<AnalyticsSort>("MOST_TICKETS");

  const analytics = useMemo(() => (active ? computeAllRoomsAnalytics(rooms, tickets) : null), [active, rooms, tickets]);
  const roomStats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const floorOptions = useMemo(() => {
    const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
    return [{ value: "ALL" as const, label: "All floors" }, ...floors.map((f) => ({ value: f, label: `Floor ${f}` }))];
  }, [rooms]);

  const listed = useMemo(() => {
    if (!analytics) return [];
    return rooms
      .filter((r) => (analytics.get(r.id)?.totalTickets ?? 0) > 0)
      .filter((r) => !search || r.room_number.includes(search.trim()))
      .filter((r) => floor === "ALL" || r.floor === floor)
      .filter((r) => block === "ALL" || r.block === block)
      .sort((a, b) => {
        const A = analytics.get(a.id)!;
        const B = analytics.get(b.id)!;
        if (sort === "MOST_TICKETS") return B.totalTickets - A.totalTickets;
        if (sort === "OPEN_TICKETS") return B.openTickets - A.openTickets;
        if (sort === "RUSH_HOUR") return (B.rushHour?.count ?? 0) - (A.rushHour?.count ?? 0);
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      });
  }, [analytics, rooms, search, floor, block, sort]);

  const summary = useMemo(() => {
    if (!analytics) return null;
    let withIssues = 0;
    let withRush = 0;
    let top: { room: string; count: number } | null = null;
    analytics.forEach((s) => {
      if (s.totalTickets > 0) {
        withIssues++;
        if (!top || s.totalTickets > top.count) top = { room: s.roomNumber, count: s.totalTickets };
      }
      if (s.rushHour) withRush++;
    });
    return { withIssues, withRush, top: top as { room: string; count: number } | null };
  }, [analytics]);

  if (!analytics || !summary) return null;

  return (
    <>
      <KpiGrid>
        <Kpi label="Rooms with tickets" value={summary.withIssues} hint={`of ${rooms.length} rooms`} icon={<BedDouble />} />
        <Kpi label="Rush hours found" value={summary.withRush} hint="Rooms with a peak hour" icon={<Clock />} />
        <Kpi
          label="Most reported room"
          value={summary.top ? summary.top.room : "–"}
          hint={summary.top ? plural(summary.top.count, "ticket") : "No tickets yet"}
          tone={summary.top ? "warning" : "neutral"}
          icon={<Repeat />}
        />
        <Kpi label="Total tickets" value={tickets.length} hint={`${openCount} open`} icon={<ClipboardList />} />
      </KpiGrid>

      <Panel title="Room patterns" description="Peak complaint hours and repeated problems per room" icon={<ChartColumn />}>
        <div className="mb-5">
          <FilterBar>
            <SearchInput label="Search rooms" placeholder="Room number" value={search} onChange={setSearch} />
            <SelectField label="Floor" icon={<Layers />} value={floor} onChange={setFloor} options={floorOptions} />
            <SelectField label="Block" icon={<Building2 />} value={block} onChange={setBlock} options={BLOCK_OPTIONS} />
            <SelectField label="Sort" icon={<ListFilter />} value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </FilterBar>
        </div>

        {listed.length === 0 ? (
          <EmptyState icon={<ChartColumn />} title="No rooms with tickets" description="Patterns appear once rooms have reported issues." />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listed.map((room) => (
              <RoomPatternCard key={room.id} room={room} stats={analytics.get(room.id)!} headline={roomHeadline(room, roomStats.get(room.id))} onOpen={onOpenRoom} />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
});

const RoomPatternCard = memo(function RoomPatternCard({
  room,
  stats: s,
  headline,
  onOpen,
}: {
  room: HotelRoom;
  stats: RoomAnalyticsSummary;
  headline: ReturnType<typeof roomHeadline>;
  onOpen: (room: HotelRoom) => void;
}) {
  const figures: [string, string | number][] = [
    ["Total", s.totalTickets],
    ["Resolved", s.resolvedTickets],
    ["Open", s.openTickets],
    ["Avg fix", s.avgResolutionMinutes != null ? `${Math.round(s.avgResolutionMinutes)}m` : "–"],
  ];
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums tracking-tight">Room {room.room_number}</p>
          <p className="text-xs text-fg-muted">
            Floor {room.floor} · {blockLabel(room.block)}
          </p>
        </div>
        <ToneBadge tone={headline.tone}>{headline.label}</ToneBadge>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Clock className="size-3.5" aria-hidden /> Rush hour
        </p>
        {s.rushHour ? (
          <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold tabular-nums">{s.rushHour.hourRange}</span>
            <span className="text-xs text-fg-muted">{s.rushHour.date}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-fg-muted">No peak yet</p>
        )}
      </div>

      <ProblemBars problems={s.topProblems.slice(0, 3)} />

      <dl className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
        {figures.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-fg-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <Button variant="secondary" size="touch" onClick={() => onOpen(room)} className="w-full justify-center">
        Open room
      </Button>
    </li>
  );
});
