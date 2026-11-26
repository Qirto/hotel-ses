import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { loadHotelData } from "@/utils/loadHotelData";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata: Metadata = { title: "Analyses · Hotel SES" };

export default async function AnalyticsPage() {
  const session = await requireRoute("/analytics");
  const withStaff = can(session.role, "analytics.staff");
  const data = await loadHotelData({ rooms: true, tickets: true, staff: withStaff, departments: withStaff });
  return (
    <AnalyticsClient
      role={session.role}
      rooms={data.rooms}
      tickets={data.reclamationsList}
      staff={data.staffList}
      departments={data.departmentsList}
    />
  );
}
