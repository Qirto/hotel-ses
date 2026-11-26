"use client";

import { memo, useMemo } from "react";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableActions, ROW_ICON_BUTTON, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, SearchInput, SelectField } from "@/components/features/Filters";
import { EmptyState, Panel } from "@/components/features/Panel";
import { ToneBadge } from "@/components/features/StatusBadges";
import { blockLabel, blockOptions, CLEANING_LABEL, CLEANING_TONE, floorOptions } from "@/lib/rooms";
import { plural } from "@/lib/format";

/** In the URL (/admin/rooms?q=…&floor=…&block=…): kept on refresh, Back and shared links. */
const INVENTORY_FILTERS = { q: "", floor: "ALL", block: "ALL" };

/** Administration: the room inventory (add, renumber, change block, delete). */
export const RoomInventoryView = memo(function RoomInventoryView({
  rooms,
  pending,
  onAdd,
  onEdit,
  onRemove,
}: {
  rooms: readonly HotelRoom[];
  pending: boolean;
  onAdd: () => void;
  onEdit: (room: HotelRoom) => void;
  onRemove: (room: HotelRoom) => void;
}) {
  const [filters, setFilters] = useUrlFilters(INVENTORY_FILTERS);
  const search = filters.q;
  const setSearch = (q: string) => setFilters({ q });
  const floor: number | "ALL" = filters.floor === "ALL" ? "ALL" : Number(filters.floor);
  const setFloor = (value: number | "ALL") => setFilters({ floor: String(value) });
  const block = filters.block;
  const setBlock = (value: string) => setFilters({ block: value });
  const floors = useMemo(() => floorOptions(rooms), [rooms]);
  const blocks = useMemo(() => blockOptions(rooms), [rooms]);
  const rows = useMemo(
    () => rooms.filter((r) => (!search.trim() || r.room_number.includes(search.trim())) && (floor === "ALL" || r.floor === floor) && (block === "ALL" || r.block === block)),
    [rooms, search, floor, block]
  );

  const columns = useMemo<DataTableColumn<HotelRoom>[]>(
    () => [
      {
        key: "room_number",
        header: "Chambre",
        primary: true,
        minWidth: 7,
        accessor: (r) => Number(r.room_number),
        cell: (r) => <span className="font-semibold tabular-nums">{r.room_number}</span>,
      },
      { key: "floor", header: "Étage", minWidth: 5, accessor: (r) => r.floor, cell: (r) => <span className="tabular-nums text-fg-secondary">{r.floor}</span> },
      { key: "block", header: "Bloc", minWidth: 5.5, accessor: (r) => blockLabel(r.block), cell: (r) => <span className="text-fg-secondary">{blockLabel(r.block)}</span> },
      {
        key: "side",
        header: "Côté",
        minWidth: 8,
        priority: 3,
        accessor: (r) => Number(r.room_number) % 2,
        cell: (r) => <span className="text-fg-secondary">{Number(r.room_number) % 2 ? "Gauche (impairs)" : "Droit (pairs)"}</span>,
      },
      {
        key: "state",
        header: "État",
        minWidth: 8.5,
        priority: 2,
        accessor: (r) => (r.is_occupied ? "Occupée" : CLEANING_LABEL[r.cleaning_status]),
        cell: (r) => <ToneBadge tone={r.is_occupied ? "info" : CLEANING_TONE[r.cleaning_status]}>{r.is_occupied ? "Occupée" : CLEANING_LABEL[r.cleaning_status]}</ToneBadge>,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        minWidth: 6.5,
        grow: 0.6,
        fullWidthOnMobile: true,
        mobileLabel: "",
        accessor: () => "",
        cell: (r) => (
          <DataTableActions>
            <Button variant="ghost" size={ROW_ICON_BUTTON} className="flex-none" title={`Modifier la chambre ${r.room_number}`} aria-label={`Modifier la chambre ${r.room_number}`} onClick={() => onEdit(r)} disabled={pending}>
              <Pencil className="size-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size={ROW_ICON_BUTTON} className="flex-none" title={`Supprimer la chambre ${r.room_number}`} aria-label={`Supprimer la chambre ${r.room_number}`} onClick={() => onRemove(r)} disabled={pending}>
              <Trash2 className="size-3.5 text-danger" aria-hidden />
            </Button>
          </DataTableActions>
        ),
      },
    ],
    [pending, onEdit, onRemove]
  );

  return (
    <Panel
      title="Parc des chambres"
      description={`${rows.length} sur ${plural(rooms.length, "chambre")}`}
      icon={<DoorOpen />}
      actions={
        <Button variant="primary" size="touch" onClick={onAdd} leftIcon={<Plus className="size-4" aria-hidden />}>
          Ajouter une chambre
        </Button>
      }
    >
      <FilterBar className="mb-4">
        <SearchInput label="Rechercher une chambre" placeholder="Numéro de chambre" value={search} onChange={setSearch} />
        <SelectField label="Étage" value={floor} onChange={setFloor} options={floors} />
        <SelectField label="Bloc" value={block} onChange={setBlock} options={blocks} />
      </FilterBar>
      <DataTable<HotelRoom>
        rows={rows}
        columns={columns}
        getRowLabel={(r) => `Chambre ${r.room_number}`}
        selectable={false}
        searchable={false}
        maxHeight={null}
        defaultSort={{ key: "room_number", dir: "asc" }}
        pageSize={50}
        density="compact"
        emptyState={<EmptyState icon={<DoorOpen />} title="Aucune chambre" description="Aucune chambre ne correspond à ces filtres." />}
        ariaLabel="Parc des chambres"
      />
    </Panel>
  );
});
