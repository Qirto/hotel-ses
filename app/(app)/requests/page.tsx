import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { RequestsClient } from "./RequestsClient";

export const metadata: Metadata = { title: "Demandes · Hotel SES" };

export default async function RequestsPage() {
  const session = await requireRoute("/requests");
  const { reclamationsList, departmentsList } = await loadHotelData({ tickets: true, departments: true });
  return <RequestsClient role={session.role} tickets={reclamationsList} departments={departmentsList} />;
}
