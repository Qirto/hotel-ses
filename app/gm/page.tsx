import ManagerPortal from "@/app/components/ManagerPortal";
import { denyUnlessPortal } from "@/lib/server/portal-access";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const denied = await denyUnlessPortal("gm");
  if (denied) return denied;
  const { rooms, staffList, reclamationsList, isLiveSupabase } = await loadHotelData({ staff: true });
  return <ManagerPortal rooms={rooms} reclamations={reclamationsList} staffList={staffList} isLiveSupabase={isLiveSupabase} />;
}
