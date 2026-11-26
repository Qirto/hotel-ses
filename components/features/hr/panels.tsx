"use client";

import type { Staff } from "@/utils/roomsData";
import type { useDepartmentsCrud } from "@/hooks/useDepartmentsCrud";
import type { useStaffDirectory } from "@/hooks/useStaffDirectory";
import { DepartmentsView } from "./DepartmentsView";
import { DirectoryView } from "./DirectoryView";

/* The staff and services screens wired to their shared hooks: used as-is by the
   RH and Administration portals. */

/** The staff directory wired to the shared hooks (also used by the Administration portal). */
export function StaffDirectoryPanel({
  people,
  services,
  pending,
}: {
  people: ReturnType<typeof useStaffDirectory>;
  services: ReturnType<typeof useDepartmentsCrud>;
  pending: boolean;
}) {
  return (
    <DirectoryView
      staff={people.staff}
      rows={people.rows}
      onShiftCount={people.onShiftCount}
      departmentCount={services.active.length}
      search={people.search}
      onSearchChange={people.setSearch}
      department={people.department}
      onDepartmentChange={people.setDepartment}
      departmentOptions={services.filterOptions}
      departmentName={services.name}
      pending={pending}
      onToggleShift={people.toggleShift}
      onMarkAbsent={people.askAbsent}
      onRemove={people.askRemove}
      onEdit={people.openEdit}
      onAdd={people.openCreate}
    />
  );
}

/** The services list wired to the shared hook (also used by the Administration portal). */
export function ServicesPanel({ services, staff, pending }: { services: ReturnType<typeof useDepartmentsCrud>; staff: readonly Staff[]; pending: boolean }) {
  return <DepartmentsView departments={services.departments} staff={staff} pending={pending} onAdd={services.openCreate} onEdit={services.openEdit} onRemove={services.askRemove} />;
}
