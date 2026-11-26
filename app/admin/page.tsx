import AdminPortal from "@/app/components/AdminPortal";
import { denyUnlessPortal } from "@/lib/server/portal-access";
import { loadAccounts } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const denied = await denyUnlessPortal("admin");
  if (denied) return denied;
  const [session, data, accountList] = await Promise.all([getSession(), loadHotelData({ departments: true, staff: true }), loadAccounts()]);
  return (
    <AdminPortal
      rooms={data.rooms}
      reclamationsList={data.reclamationsList}
      staffList={data.staffList}
      departmentsList={data.departmentsList}
      accountList={accountList}
      currentUserId={session?.userId ?? ""}
      isLiveSupabase={data.isLiveSupabase}
    />
  );
}
