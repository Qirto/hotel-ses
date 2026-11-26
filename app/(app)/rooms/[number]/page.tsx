import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomDetailView } from "@/components/features/detail/RoomDetailView";
import { requireRoute } from "@/lib/server/session";
import { loadRoomDetail } from "@/utils/loadHotelData";

export async function generateMetadata({ params }: PageProps<"/rooms/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: `Chambre ${number} · Hotel SES` };
}

/** A room as a full page (refresh, shared link); from inside the app it opens as a modal instead. */
export default async function RoomPage({ params }: PageProps<"/rooms/[number]">) {
  const session = await requireRoute("/rooms");
  const detail = await loadRoomDetail((await params).number);
  if (!detail) notFound();
  return <RoomDetailView role={session.role} room={detail.room} tickets={detail.tickets} frame="page" />;
}
