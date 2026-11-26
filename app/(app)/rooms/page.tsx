import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { RoomsClient } from "./RoomsClient";

export const metadata: Metadata = { title: "Chambres · Hotel SES" };

export default async function RoomsPage() {
  await requireRoute("/rooms");
  const { rooms, reclamationsList } = await loadHotelData({ rooms: true, tickets: true });
  return <RoomsClient rooms={rooms} tickets={reclamationsList} />;
}
