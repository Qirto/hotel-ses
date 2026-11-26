"use client";

import type { HotelRoom } from "@/utils/roomsData";
import { RoomInventoryView } from "@/components/features/admin/RoomInventoryView";
import { useActions } from "@/hooks/useActions";
import { useConfirm } from "@/hooks/useConfirm";
import { useRoomInventory } from "@/hooks/useRoomInventory";

/** Room inventory: add, renumber, change block, delete. */
export function InventoryClient({ rooms }: { rooms: HotelRoom[] }) {
  const actions = useActions();
  const confirm = useConfirm(actions);
  const inventory = useRoomInventory(actions, confirm.ask);
  return (
    <>
      <RoomInventoryView rooms={rooms} pending={actions.isPending} onAdd={inventory.openCreate} onEdit={inventory.openEdit} onRemove={inventory.askRemove} />
      {inventory.formElement}
      {confirm.element}
    </>
  );
}
