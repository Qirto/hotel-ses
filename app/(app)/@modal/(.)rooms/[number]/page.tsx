import { notFound } from "next/navigation";
import { RoomDetailView } from "@/components/features/detail/RoomDetailView";
import { requireRoute } from "@/lib/server/session";
import { loadRoomDetail } from "@/utils/loadHotelData";

/** /rooms/<number> opened from inside the app: the room as a modal over the current page. */
export default async function RoomModal({ params }: PageProps<"/rooms/[number]">) {
  const session = await requireRoute("/rooms");
  const detail = await loadRoomDetail((await params).number);
  if (!detail) notFound();
  return <RoomDetailView role={session.role} room={detail.room} tickets={detail.tickets} frame="sheet" />;
}
