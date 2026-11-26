"use client";

import { useId, useState } from "react";
import { DoorOpen, Hash, Save } from "lucide-react";
import type { HotelRoom } from "@/utils/roomsData";
import { ResponsiveSheet, SheetActions } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextInput } from "@/components/features/Forms";
import { INPUT_ICON } from "@/lib/styles";

export type RoomFormInput = { room_number: string; block: "BLOCK_A" | "BLOCK_B" };

const BLOCKS = [
  { value: "BLOCK_A", label: "Bloc A" },
  { value: "BLOCK_B", label: "Bloc B" },
] as const;

/**
 * Add or edit a room of the inventory. The floor is the number's first digit and the
 * corridor side its parity, so only the number and the block are asked.
 * Render with `key={room?.id ?? "new"}`.
 */
export function RoomFormSheet({
  open,
  onOpenChange,
  room,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: HotelRoom | null;
  pending: boolean;
  onSubmit: (input: RoomFormInput) => Promise<boolean>;
}) {
  const id = useId();
  const editing = Boolean(room);
  const [number, setNumber] = useState(room?.room_number ?? "");
  const [block, setBlock] = useState<RoomFormInput["block"]>(room?.block ?? "BLOCK_A");
  const digits = number.trim();
  const preview = /^[1-3]\d{3}$/.test(digits) ? `Étage ${digits[0]} · côté ${Number(digits) % 2 ? "gauche (impairs)" : "droit (pairs)"}` : "Le premier chiffre donne l’étage (1 à 3).";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Modifier la chambre ${room?.room_number}` : "Ajouter une chambre"}
      description={editing ? "Changer le numéro régénère le QR code de la porte." : "La chambre est créée libre et propre."}
      footer={
        <SheetActions onCancel={() => onOpenChange(false)}>
          <Button
            type="submit"
            form={`${id}-form`}
            variant="primary"
            isLoading={pending}
            loadingText="Enregistrement"
            leftIcon={editing ? <Save className="size-4" aria-hidden /> : <DoorOpen className="size-4" aria-hidden />}
            className="justify-center"
          >
            {editing ? "Enregistrer" : "Ajouter la chambre"}
          </Button>
        </SheetActions>
      }
    >
      <form
        id={`${id}-form`}
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit({ room_number: digits, block });
        }}
      >
        <Field label="Numéro" htmlFor={`${id}-number`} hint={preview}>
          <div className="relative">
            <Hash className={INPUT_ICON} aria-hidden />
            <TextInput id={`${id}-number`} required inputMode="numeric" maxLength={4} autoComplete="off" placeholder="ex. 3077" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} className="pl-9" />
          </div>
        </Field>
        <Segmented label="Bloc" value={block} onChange={setBlock} options={BLOCKS} />
      </form>
    </ResponsiveSheet>
  );
}
