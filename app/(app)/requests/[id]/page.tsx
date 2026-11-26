import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestDetailView } from "@/components/features/detail/RequestDetailView";
import { requireRoute } from "@/lib/server/session";
import { loadRequestDetail } from "@/utils/loadHotelData";

export async function generateMetadata({ params }: PageProps<"/requests/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Demande n° ${id} · Hotel SES` };
}

/** A request as a full page (refresh, shared link); from inside the app it opens as a modal instead. */
export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const session = await requireRoute("/requests");
  const detail = await loadRequestDetail(session.role, (await params).id);
  if (!detail) notFound();
  return <RequestDetailView role={session.role} ticket={detail.ticket} staff={detail.staff} frame="page" />;
}
