import { loadHotelData } from "@/utils/loadHotelData";
import ManagerPortal from "@/app/components/ManagerPortal";
import AccessDenied from "@/app/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const { rooms, isLiveSupabase, staffList, reclamationsList, userRole } = await loadHotelData();

  if (userRole !== "gm") {
    return <AccessDenied requiredRole="gm" currentRole={userRole} />;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--surface-0)", color: "var(--text-primary)" }}>
      <ManagerPortal
        rooms={rooms}
        reclamations={reclamationsList}
        staff={staffList}
        isLiveSupabase={isLiveSupabase}
      />
    </main>
  );
}
