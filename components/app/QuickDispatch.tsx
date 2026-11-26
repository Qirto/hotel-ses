"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { HotelRoom } from "@/utils/roomsData";
import { Fab } from "@/components/app/Fab";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { NewTicketForm, PastIncidentForm, type NewTicketInput, type PastIncidentInput } from "@/components/features/Forms";
import { useHotelState } from "@/hooks/useHotelState";
import { useTicketMutations } from "@/hooks/useTicketMutations";

type QuickDispatch = { openDispatch: () => void; openBackfill: () => void };

/** Stable empty list: the quick forms only add requests, they never list them. */
const NO_TICKETS: never[] = [];

/** No-op outside the provider (roles without front-desk dispatch). */
const QuickDispatchContext = createContext<QuickDispatch | null>(null);

/** Open the front desk's « Créer la demande » / « Incident passé » forms, or null when the role has none. */
export const useQuickDispatch = () => useContext(QuickDispatchContext);

/**
 * The front desk's quick forms (room typed by hand), available on every page: a
 * floating « Créer la demande » button plus the two sheets. Mounted by the app layout
 * only for roles with `requests.dispatch`.
 */
export function QuickDispatchProvider({ rooms, children }: { rooms: HotelRoom[]; children: ReactNode }) {
  const router = useRouter();
  const p = useHotelState({ rooms, reclamations: NO_TICKETS });
  const tickets = useTicketMutations(p, "Réception");
  const [sheet, setSheet] = useState<"dispatch" | "backfill" | null>(null);
  const close = useCallback(() => setSheet(null), []);

  const findRoom = (number?: string) => {
    const room = number ? rooms.find((r) => r.room_number === number) : undefined;
    if (!room) p.flash("danger", number ? `Aucune chambre n° ${number}.` : "Saisissez un numéro de chambre.");
    return room;
  };
  const dispatch = async (input: NewTicketInput) => {
    const room = findRoom(input.room);
    const ok = room ? await tickets.createTicket(room, input) : false;
    if (ok) {
      close();
      router.refresh();
    }
    return ok;
  };
  const backfill = async (input: PastIncidentInput) => {
    const room = findRoom(input.room);
    const ok = room ? await tickets.recordPast(room, input) : false;
    if (ok) {
      close();
      router.refresh();
    }
    return ok;
  };

  const value = useMemo<QuickDispatch>(() => ({ openDispatch: () => setSheet("dispatch"), openBackfill: () => setSheet("backfill") }), []);

  return (
    <QuickDispatchContext.Provider value={value}>
      {children}
      <Fab label="Créer la demande" onClick={value.openDispatch} />
      <ResponsiveSheet
        open={sheet === "dispatch"}
        onOpenChange={(o) => !o && close()}
        title="Créer la demande"
        description="Enregistrez la demande du client et transmettez-la au service concerné."
      >
        <NewTicketForm withRoom onSubmit={dispatch} pending={p.isPending} />
      </ResponsiveSheet>
      <ResponsiveSheet
        open={sheet === "backfill"}
        onOpenChange={(o) => !o && close()}
        title="Saisir un incident passé"
        description="Ajoutez une demande antérieure à l’historique d’une chambre, avec sa date réelle."
      >
        <PastIncidentForm withRoom onSubmit={backfill} pending={p.isPending} />
      </ResponsiveSheet>
    </QuickDispatchContext.Provider>
  );
}
