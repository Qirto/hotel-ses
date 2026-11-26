import ReceptionPortal from "@/app/components/ReceptionPortal";
import { denyUnlessPortal } from "@/lib/server/portal-access";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const denied = await denyUnlessPortal("reception");
  if (denied) return denied;
  const { rooms, departmentsList, reclamationsList, isLiveSupabase } = await loadHotelData({ departments: true });
  return <ReceptionPortal rooms={rooms} departmentsList={departmentsList} reclamationsList={reclamationsList} isLiveSupabase={isLiveSupabase} />;
}
