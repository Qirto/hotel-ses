"use client";

import { useCallback } from "react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import type { NewTicketInput, PastIncidentInput } from "@/components/features/Forms";
import { acknowledgeReclamation, createHistoricalReclamation, createRapidReclamation, resolveReclamation } from "@/app/actions";
import type { PortalState } from "./usePortalState";

/**
 * Every ticket write a portal can make, implemented once (was copied in all three
 * portals, with drift: some new tickets lacked their room number, one resolve always
 * reported success). `actor` names the portal in the default description of new tickets.
 *
 * - acknowledge / resolve: optimistic, reverted (with a message) if the server refuses.
 * - createTicket / recordPast: for any room (quick-dispatch sheets) and, bound to the
 *   open room detail, createInSelectedRoom / recordInSelectedRoom.
 *   New tickets are added to the list with their room number, so they show and are
 *   searchable at once, before the realtime refresh.
 */
export function useTicketMutations<Tab extends string>(p: PortalState<Tab>, actor: string) {
  const { run, runForResult, setTickets, flash, selectedRoom } = p;

  const updateTicket = useCallback(
    (id: number, patch: Partial<Reclamation>, action: () => Promise<{ success: boolean }>, ok: string, fail: string) =>
      // optimistic patch inside `run`, so nothing changes on screen when the action is refused (offline)
      run(async () => {
        let previous: Reclamation | undefined;
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            previous = t;
            return { ...t, ...patch };
          })
        );
        const res = await action();
        if (res.success) return flash("success", ok);
        const before = previous;
        if (before) setTickets((prev) => prev.map((t) => (t.id === id ? before : t)));
        flash("danger", fail);
      }),
    [run, setTickets, flash]
  );

  const acknowledge = useCallback(
    (id: number) => updateTicket(id, { status: "IN_PROGRESS" }, () => acknowledgeReclamation(id), "Ticket marked in progress.", "Could not update the ticket."),
    [updateTicket]
  );

  const resolve = useCallback(
    (id: number) =>
      updateTicket(
        id,
        { status: "RESOLVED", resolved_at: new Date().toISOString() },
        () => resolveReclamation(id),
        "Ticket resolved.",
        "Could not resolve the ticket."
      ),
    [updateTicket]
  );

  /** Adds the created ticket to the list, with its room number. */
  const addTicket = useCallback(
    (room: HotelRoom, data: unknown) => setTickets((prev) => [{ ...(data as Reclamation), room: { room_number: room.room_number } }, ...prev]),
    [setTickets]
  );

  const createTicket = useCallback(
    (room: HotelRoom, input: NewTicketInput) =>
      runForResult(async () => {
        const res = await createRapidReclamation({
          roomId: room.id,
          department: input.department,
          category: input.category,
          description: input.description || `${input.category} reported by ${actor}`,
          priority: input.priority,
          isConfidential: false,
        });
        if (res.success && res.data) addTicket(room, res.data);
        flash(res.success ? "success" : "danger", res.success ? `Ticket created for room ${room.room_number}.` : res.error || "Could not create the ticket.");
        return Boolean(res.success);
      }),
    [runForResult, addTicket, flash, actor]
  );

  const recordPast = useCallback(
    (room: HotelRoom, input: PastIncidentInput) =>
      runForResult(async () => {
        const res = await createHistoricalReclamation({
          roomId: room.id,
          department: input.department,
          category: input.category,
          description: input.description || `Past ${input.category} incident recorded by ${actor}`,
          status: input.status,
          createdAt: input.createdAt,
          isConfidential: false,
        });
        if (res.success && res.data) addTicket(room, res.data);
        flash(res.success ? "success" : "danger", res.success ? `Past incident recorded for room ${room.room_number}.` : res.error || "Could not record the incident.");
        return Boolean(res.success);
      }),
    [runForResult, addTicket, flash, actor]
  );

  const createInSelectedRoom = useCallback(
    async (input: NewTicketInput) => (selectedRoom ? createTicket(selectedRoom, input) : false),
    [selectedRoom, createTicket]
  );
  const recordInSelectedRoom = useCallback(
    async (input: PastIncidentInput) => (selectedRoom ? recordPast(selectedRoom, input) : false),
    [selectedRoom, recordPast]
  );

  return { acknowledge, resolve, createTicket, recordPast, createInSelectedRoom, recordInSelectedRoom };
}
