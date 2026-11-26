"use client";

import { memo, useMemo, useState } from "react";
import { BedDouble, Layers } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { Panel } from "@/components/features/Panel";
import { FilterBar, PillGroup, SearchInput, SelectField } from "@/components/features/Filters";
import { RoomGrid } from "@/components/features/RoomGrid";
import { countRoomsNeedingAttention } from "@/lib/tickets";
import { floorOptions as floorOptionsFor, matchesRoomFilter, roomStatusCounts, ticketStatsByRoom, type RoomFilter } from "@/lib/rooms";
import { plural } from "@/lib/format";

/**
 * Rooms tab shared by every portal. The status filter can be controlled from
 * outside (`filter` / `onFilterChange`) so dashboard KPIs can deep-link into
 * it; search and floor are the view's own.
 */
export const RoomsView = memo(function RoomsView({
  rooms,
  tickets,
  onSelectRoom,
  filter,
  onFilterChange,
}: {
  rooms: readonly HotelRoom[];
  tickets: readonly Reclamation[];
  onSelectRoom: (room: HotelRoom) => void;
  filter?: RoomFilter;
  onFilterChange?: (filter: RoomFilter) => void;
}) {
  const [ownFilter, setOwnFilter] = useState<RoomFilter>("ALL");
  const status = filter ?? ownFilter;
  const setStatus = onFilterChange ?? setOwnFilter;
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState<number | "ALL">("ALL");

  const stats = useMemo(() => ticketStatsByRoom(tickets), [tickets]);
  const counts = useMemo(() => roomStatusCounts(rooms), [rooms]);
  const attention = useMemo(() => countRoomsNeedingAttention(rooms, tickets), [rooms, tickets]);

  const floorOptions = useMemo(() => floorOptionsFor(rooms), [rooms]);

  const statusOptions = useMemo(
    () =>
      [
        { value: "ALL", label: "All" },
        { value: "ATTENTION", label: "Needs attention", count: attention },
        { value: "OCCUPIED", label: "Occupied", count: counts.occupied },
        { value: "VACANT", label: "Vacant", count: counts.vacant },
        { value: "VACANT_CLEAN", label: "Ready", count: counts.vacantClean },
        { value: "DIRTY", label: "Dirty", count: counts.dirty },
      ] as const satisfies readonly { value: RoomFilter; label: string; count?: number }[],
    [attention, counts]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return rooms.filter(
      (r) => (!q || r.room_number.includes(q)) && (floor === "ALL" || r.floor === floor) && matchesRoomFilter(r, status, stats.get(r.id))
    );
  }, [rooms, search, floor, status, stats]);

  return (
    <Panel title="Rooms" description={`${filtered.length} of ${plural(rooms.length, "room")}`} icon={<BedDouble />}>
      <div className="mb-5 flex flex-col gap-2">
        <FilterBar>
          <SearchInput label="Search rooms" placeholder="Room number" value={search} onChange={setSearch} />
          <SelectField label="Floor" icon={<Layers />} value={floor} onChange={setFloor} options={floorOptions} />
        </FilterBar>
        <PillGroup<RoomFilter> label="Room status" value={status} onChange={setStatus} options={statusOptions} />
      </div>
      <RoomGrid rooms={filtered} tickets={tickets} onSelect={onSelectRoom} />
    </Panel>
  );
});
