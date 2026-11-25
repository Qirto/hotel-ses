import { loadHotelData } from "@/utils/loadHotelData";
import HrPortal from "@/app/components/HrPortal";
import AccessDenied from "@/app/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function RhPage() {
  const { rooms, isLiveSupabase, departmentsList, staffList, reclamationsList, userRole } = await loadHotelData();

  if (userRole !== "rh") {
    return <AccessDenied requiredRole="rh" currentRole={userRole} />;
  }

  return (
    <>
      <HrPortal
        staffList={staffList}
        departmentsList={departmentsList}
        reclamationsList={reclamationsList}
        rooms={rooms}
        isLiveSupabase={isLiveSupabase}
      />
    </>
  );
}
