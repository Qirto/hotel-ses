import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Tableau de bord · Hotel SES" };

export default async function DashboardPage() {
  const session = await requireRoute("/dashboard");
  const { rooms, reclamationsList } = await loadHotelData({ rooms: true, tickets: true });
  return <DashboardClient role={session.role} rooms={rooms} tickets={reclamationsList} />;
}
