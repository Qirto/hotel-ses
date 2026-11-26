import type { ReactNode } from "react";
import { requireRoute } from "@/lib/server/session";
import { loadHotelData } from "@/utils/loadHotelData";
import { StaffProvider } from "./StaffProvider";

/**
 * Staff section (/staff, /staff/shifts, /staff/services). The layout stays mounted
 * across its three pages, so the roster's unsaved changes and the forms survive
 * switching tabs.
 */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  await requireRoute("/staff");
  const { staffList, departmentsList } = await loadHotelData({ staff: true, departments: true });
  return (
    <StaffProvider staff={staffList} departments={departmentsList}>
      {children}
    </StaffProvider>
  );
}
