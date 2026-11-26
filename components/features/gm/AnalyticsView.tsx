"use client";

import { memo, useMemo } from "react";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { BedDouble, ChartColumn, ClipboardList, Clock, Repeat } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/features/Panel";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { ProblemBars } from "@/components/features/RoomDetail";
import { ToneBadge } from "@/components/features/StatusBadges";
import { countOpenTickets } from "@/lib/tickets";
import { blockOptions, floorOptions as floorOptionsFor, roomHeadline, roomLocation, ticketStatsByRoom } from "@/lib/rooms";
import { formatMinutes, plural } from "@/lib/format";
import { computeAllRoomsAnalytics, type RoomAnalyticsSummary } from "@/utils/roomAnalytics";

const ANALYTICS_FILTERS = { q: "", floor: "ALL", block: "ALL", sort: "MOST_TICKETS" };

type AnalyticsSort = "MOST_TICKETS" | "OPEN_TICKETS" | "RUSH_HOUR" | "ROOM_NUMBER";

const SORT_OPTIONS = [
  { value: "MOST_TICKETS", label: "Plus de demandes" },
  { value: "OPEN_TICKETS", label: "Plus de demandes ouvertes" },
  { value: "RUSH_HOUR", label: "Pic le plus élevé" },
  { value: "ROOM_NUMBER", label: "Numéro de chambre" },
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
  // In the URL (/analytics?q=…&floor=…&block=…&sort=…): kept on refresh, Back and shared links.
  const [filters, setFilters] = useUrlFilters(ANALYTICS_FILTERS);
  const search = filters.q;
  const setSearch = (q: string) => setFilters({ q });
  const floor: number | "ALL" = filters.floor === "ALL" ? "ALL" : Number(filters.floor);
  const setFloor = (value: number | "ALL") => setFilters({ floor: String(value) });
  const block = filters.block;
  const setBlock = (value: string) => setFilters({ block: value });
  const sort = filters.sort as AnalyticsSort;
  const setSort = (value: AnalyticsSort) => setFilters({ sort: value });

  const analytics = useMemo(() => (active ? computeAllRoomsAnalytics(rooms, tickets) : null), [active, rooms, tickets]);
  const roomStats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const floorOptions = useMemo(() => floorOptionsFor(rooms), [rooms]);
  const blockOptionsList = useMemo(() => blockOptions(rooms), [rooms]);

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
        <Kpi label="Chambres avec demandes" value={summary.withIssues} hint={`sur ${plural(rooms.length, "chambre")}`} icon={<BedDouble />} />
        <Kpi label="Heures de pointe détectées" value={summary.withRush} hint="Chambres avec une heure de pointe" icon={<Clock />} />
        <Kpi
          label="Chambre la plus signalée"
          value={summary.top ? summary.top.room : "–"}
          hint={summary.top ? plural(summary.top.count, "demande") : "Aucune demande pour le moment"}
          tone={summary.top ? "warning" : "neutral"}
          icon={<Repeat />}
        />
        <Kpi label="Total des demandes" value={tickets.length} hint={plural(openCount, "ouverte")} icon={<ClipboardList />} />
      </KpiGrid>

      <Panel title="Tendances par chambre" description="Heures de pointe des réclamations et problèmes récurrents par chambre" icon={<ChartColumn />}>
        <div className="mb-5">
          <FilterBar>
            <SearchInput label="Rechercher une chambre" placeholder="Numéro de chambre" value={search} onChange={setSearch} />
            <SelectField label="Étage" value={floor} onChange={setFloor} options={floorOptions} />
            <SelectField label="Bloc" value={block} onChange={setBlock} options={blockOptionsList} />
            <SelectField label="Trier" value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </FilterBar>
        </div>

        {listed.length === 0 ? (
          <EmptyState icon={<ChartColumn />} title="Aucune chambre avec des demandes" description="Les tendances apparaissent dès que des problèmes sont signalés dans les chambres." />
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
    ["Résolues", s.resolvedTickets],
    ["Ouvertes", s.openTickets],
    ["Délai moyen", formatMinutes(s.avgResolutionMinutes)],
  ];
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums tracking-tight">Chambre {room.room_number}</p>
          <p className="text-xs text-fg-muted">
            {roomLocation(room)}
          </p>
        </div>
        <ToneBadge tone={headline.tone}>{headline.label}</ToneBadge>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Clock className="size-3.5" aria-hidden /> Heure de pointe
        </p>
        {s.rushHour ? (
          <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold tabular-nums">{s.rushHour.hourRange}</span>
            <span className="text-xs text-fg-muted">{s.rushHour.date}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-fg-muted">Aucun pic pour le moment</p>
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
        Ouvrir la chambre
      </Button>
    </li>
  );
});
