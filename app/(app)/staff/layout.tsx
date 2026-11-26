import type { ReactNode } from "react";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { StaffProvider } from "./StaffProvider";

/**
 * Staff section (/staff, /staff/shifts, /staff/services): staff, services and the saved
 * weekly roster, shared by the three pages. The layout stays mounted across them, so open
 * forms survive switching tabs.
 */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  await requireRoute("/staff");
  const { staffList, departmentsList, rosterEntries } = await loadHotelData({ staff: true, departments: true, roster: true });
  return (
    <StaffProvider staff={staffList} departments={departmentsList} roster={rosterEntries}>
      {children}
    </StaffProvider>
  );
}
