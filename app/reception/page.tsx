import { loadHotelData } from "@/utils/loadHotelData";
import ReceptionPortal from "@/app/components/ReceptionPortal";
import AccessDenied from "@/app/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const { rooms, isLiveSupabase, departmentsList, staffList, residentsList, reclamationsList, userRole } = await loadHotelData();

  if (userRole !== "reception") {
    return <AccessDenied requiredRole="reception" currentRole={userRole} />;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b132b", color: "#f8fafc", padding: "1rem 0" }}>
      <ReceptionPortal
        rooms={rooms}
        residents={residentsList}
        departmentsList={departmentsList}
        reclamationsList={reclamationsList}
        staffList={staffList}
        isLiveSupabase={isLiveSupabase}
      />
    </main>
  );
}
