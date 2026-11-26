import HrPortal from "@/app/components/HrPortal";
import { denyUnlessPortal } from "@/lib/server/portal-access";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

export default async function RhPage() {
  const denied = await denyUnlessPortal("rh");
  if (denied) return denied;
  const { rooms, departmentsList, staffList, reclamationsList, isLiveSupabase } = await loadHotelData({ departments: true, staff: true });
  return <HrPortal staffList={staffList} departmentsList={departmentsList} reclamationsList={reclamationsList} rooms={rooms} isLiveSupabase={isLiveSupabase} />;
}
