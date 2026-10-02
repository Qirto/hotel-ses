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
    <main style={{ minHeight: "100vh", background: "var(--surface-0)", color: "var(--text-primary)" }}>
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
