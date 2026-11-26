"use client";

import { memo, useMemo } from "react";
import { BedDouble } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { Panel } from "@/components/features/Panel";
import { FilterBar, PillGroup, SearchInput, SelectField } from "@/components/features/Filters";
import { RoomGrid } from "@/components/features/RoomGrid";
import { countRoomsNeedingAttention } from "@/lib/tickets";
import { blockOptions as blockOptionsFor, floorOptions as floorOptionsFor, matchesRoomFilter, roomStatusCounts, ticketStatsByRoom, type RoomFilter } from "@/lib/rooms";
import { plural } from "@/lib/format";
import { useUrlFilters } from "@/hooks/useUrlFilters";

const ROOM_FILTERS = { q: "", floor: "ALL", block: "ALL", status: "ALL" };

/**
 * The room plan with its filters. Filters live in the URL (`/rooms?status=DIRTY&floor=1`),
 * so a refresh, Back or a shared link keeps them, and dashboard KPIs link straight
 * to a filtered plan.
 */
export const RoomsView = memo(function RoomsView({
  rooms,
  tickets,
  onSelectRoom,
}: {
  rooms: readonly HotelRoom[];
  tickets: readonly Reclamation[];
  onSelectRoom: (room: HotelRoom) => void;
}) {
  const [filters, setFilters] = useUrlFilters(ROOM_FILTERS);
  const status = filters.status as RoomFilter;
  const setStatus = (value: RoomFilter) => setFilters({ status: value });
  const search = filters.q;
  const setSearch = (value: string) => setFilters({ q: value });
  const floor: number | "ALL" = filters.floor === "ALL" ? "ALL" : Number(filters.floor);
  const setFloor = (value: number | "ALL") => setFilters({ floor: String(value) });
  const block = filters.block;
  const setBlock = (value: string) => setFilters({ block: value });

  const stats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const counts = useMemo(() => roomStatusCounts(rooms), [rooms]);
  const attention = useMemo(() => countRoomsNeedingAttention(rooms, tickets), [rooms, tickets]);

  const floorOptions = useMemo(() => floorOptionsFor(rooms), [rooms]);
  const blockOptions = useMemo(() => blockOptionsFor(rooms), [rooms]);

  const statusOptions = useMemo(
    () =>
      [
        { value: "ALL", label: "Toutes" },
        { value: "ATTENTION", label: "À traiter", count: attention },
        { value: "OCCUPIED", label: "Occupées", count: counts.occupied },
        { value: "VACANT", label: "Libres", count: counts.vacant },
        { value: "VACANT_CLEAN", label: "Prêtes", count: counts.vacantClean },
        { value: "DIRTY", label: "À nettoyer", count: counts.dirty },
      ] as const satisfies readonly { value: RoomFilter; label: string; count?: number }[],
    [attention, counts]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return rooms.filter(
      (r) => (!q || r.room_number.includes(q)) && (floor === "ALL" || r.floor === floor) && (block === "ALL" || r.block === block) && matchesRoomFilter(r, status, stats.get(r.id))
    );
  }, [rooms, search, floor, block, status, stats]);

  return (
    <Panel title="Chambres" description={`${filtered.length} sur ${plural(rooms.length, "chambre")}`} icon={<BedDouble />}>
      <div className="mb-5 flex flex-col gap-2">
        <FilterBar>
          <SearchInput label="Rechercher une chambre" placeholder="Numéro de chambre" value={search} onChange={setSearch} />
          <SelectField label="Étage" value={floor} onChange={setFloor} options={floorOptions} />
          <SelectField label="Bloc" value={block} onChange={setBlock} options={blockOptions} />
        </FilterBar>
        <PillGroup<RoomFilter> label="État des chambres" value={status} onChange={setStatus} options={statusOptions} />
      </div>
      <RoomGrid rooms={filtered} tickets={tickets} onSelect={onSelectRoom} />
    </Panel>
  );
});
