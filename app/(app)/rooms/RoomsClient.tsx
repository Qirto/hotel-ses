"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { RoomsView } from "@/components/features/views/RoomsView";

/** The room plan; a room opens at /rooms/<number> (a modal over the plan). */
export function RoomsClient({ rooms, tickets }: { rooms: HotelRoom[]; tickets: Reclamation[] }) {
  const router = useRouter();
  const open = useCallback((room: HotelRoom) => router.push(`/rooms/${room.room_number}`, { scroll: false }), [router]);
  return <RoomsView rooms={rooms} tickets={tickets} onSelectRoom={open} />;
}
