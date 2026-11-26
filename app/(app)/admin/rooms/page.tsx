import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { InventoryClient } from "./InventoryClient";

export const metadata: Metadata = { title: "Parc des chambres · Hotel SES" };

export default async function InventoryPage() {
  await requireRoute("/admin/rooms");
  const { rooms } = await loadHotelData({ rooms: true });
  return <InventoryClient rooms={rooms} />;
}
