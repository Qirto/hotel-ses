"use client";

import { ShiftsView } from "@/components/features/hr/Roster";
import { ServicesPanel, StaffDirectoryPanel } from "@/components/features/hr/panels";
import { useStaffSection } from "./StaffProvider";

/* The three staff pages: each renders its panel from the state the staff layout holds. */

export function DirectoryTab() {
  const { people, services, pending } = useStaffSection();
  return <StaffDirectoryPanel people={people} services={services} pending={pending} />;
}

export function ShiftsTab() {
  const { people, services, roster, setShift } = useStaffSection();
  return <ShiftsView staff={people.staff} roster={roster} onShiftChange={setShift} departmentOptions={services.filterOptions} />;
}

export function ServicesTab() {
  const { people, services, pending } = useStaffSection();
  return <ServicesPanel services={services} staff={people.staff} pending={pending} />;
}
