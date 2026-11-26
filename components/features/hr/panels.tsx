"use client";

import { useMemo } from "react";
import type { Staff } from "@/utils/roomsData";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import type { useDepartmentsCrud } from "@/hooks/useDepartmentsCrud";
import type { useStaffDirectory } from "@/hooks/useStaffDirectory";
import { DepartmentsView } from "./DepartmentsView";
import { DirectoryView } from "./DirectoryView";

/* The staff and services screens, wired to the hooks the staff layout holds. */

/** In the URL (/staff?q=…&service=…). Kept here, not in the layout's hook: the roster page has its own `q`. */
const DIRECTORY_FILTERS = { q: "", service: "ALL" };

/** The staff directory: the layout's staff state plus this page's search and service filter. */
export function StaffDirectoryPanel({
  people,
  services,
  pending,
}: {
  people: ReturnType<typeof useStaffDirectory>;
  services: ReturnType<typeof useDepartmentsCrud>;
  pending: boolean;
}) {
  const [filters, setFilters] = useUrlFilters(DIRECTORY_FILTERS);
  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return people.staff.filter(
      (s) => (filters.service === "ALL" || s.department === filters.service) && (!q || s.full_name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
    );
  }, [people.staff, filters.service, filters.q]);

  return (
    <DirectoryView
      staff={people.staff}
      rows={rows}
      onShiftCount={people.onShiftCount}
      departmentCount={services.active.length}
      search={filters.q}
      onSearchChange={(q) => setFilters({ q })}
      department={filters.service}
      onDepartmentChange={(service) => setFilters({ service })}
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

/** The services list, wired to the layout's services hook. */
export function ServicesPanel({ services, staff, pending }: { services: ReturnType<typeof useDepartmentsCrud>; staff: readonly Staff[]; pending: boolean }) {
  return <DepartmentsView departments={services.departments} staff={staff} pending={pending} onAdd={services.openCreate} onEdit={services.openEdit} onRemove={services.askRemove} />;
}
