"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { HotelRoom } from "@/utils/roomsData";
import { RoomFormSheet, type RoomFormInput } from "@/components/features/admin/RoomFormSheet";
import { createRoom, deleteRoom, updateRoom } from "@/app/admin-actions";
import type { ConfirmRequest, PortalRunner } from "./useConfirm";

/**
 * Room inventory for the Administration portal: add, edit, delete. Rooms come from
 * the server page, so after a change the page data is refreshed: the room plan,
 * counts and every portal see the same inventory. Render `formElement` once.
 */
export function useRoomInventory(p: PortalRunner, ask: (r: ConfirmRequest) => void) {
  const { runForResult, flash, isPending } = p;
  const router = useRouter();
  const [form, setForm] = useState<{ open: boolean; room: HotelRoom | null }>({ open: false, room: null });

  const openCreate = useCallback(() => setForm({ open: true, room: null }), []);
  const openEdit = useCallback((room: HotelRoom) => setForm({ open: true, room }), []);
  const setFormOpen = useCallback((open: boolean) => setForm((f) => ({ ...f, open })), []);

  const save = (input: RoomFormInput) =>
    runForResult(async () => {
      const room = form.room;
      const res = room ? await updateRoom(room.id, input) : await createRoom(input);
      if (res.success) {
        setFormOpen(false);
        router.refresh();
        flash("success", room ? `La chambre ${input.room_number} a été mise à jour.` : `La chambre ${input.room_number} a été ajoutée.`);
      } else flash("danger", res.error || "Impossible d’enregistrer la chambre.");
      return Boolean(res.success);
    });

  const askRemove = useCallback(
    (room: HotelRoom) =>
      ask({
        title: "Supprimer la chambre",
        description: `Supprimer la chambre ${room.room_number} du parc ? Refusé si elle a des demandes ou des clients. Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        pendingLabel: "Suppression",
        tone: "danger",
        action: async () => {
          const res = await deleteRoom(room.id);
          if (res.success) {
            router.refresh();
            flash("success", `La chambre ${room.room_number} a été supprimée.`);
          } else flash("danger", res.error || `Impossible de supprimer la chambre ${room.room_number}.`);
        },
      }),
    [ask, router, flash]
  );

  const formElement = <RoomFormSheet key={`room-${form.room?.id ?? "new"}`} open={form.open} onOpenChange={setFormOpen} room={form.room} pending={isPending} onSubmit={save} />;

  return { openCreate, openEdit, askRemove, formElement };
}
