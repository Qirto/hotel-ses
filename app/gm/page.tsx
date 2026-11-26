import ManagerPortal from "@/app/components/ManagerPortal";
import { denyUnlessPortal } from "@/lib/server/portal-access";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const denied = await denyUnlessPortal("gm");
  if (denied) return denied;
  const { rooms, reclamationsList, isLiveSupabase } = await loadHotelData();
  return <ManagerPortal rooms={rooms} reclamations={reclamationsList} isLiveSupabase={isLiveSupabase} />;
}
