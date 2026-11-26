import { notFound } from "next/navigation";
import { RequestDetailView } from "@/components/features/detail/RequestDetailView";
import { requireRoute } from "@/lib/server/session";
import { loadRequestDetail } from "@/utils/loadHotelData";

/** /requests/<id> opened from inside the app: the request as a modal over the current page. */
export default async function RequestModal({ params }: PageProps<"/requests/[id]">) {
  const session = await requireRoute("/requests");
  const detail = await loadRequestDetail(session.role, (await params).id);
  if (!detail) notFound();
  return <RequestDetailView role={session.role} ticket={detail.ticket} staff={detail.staff} frame="sheet" />;
}
