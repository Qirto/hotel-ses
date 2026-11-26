"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChartColumn, UserCheck, Users } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import { RankedBreakdown, type Series } from "@/components/features/charts/Breakdown";
import { RoomStatusPanel } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { AnalyticsView } from "@/components/features/gm/AnalyticsView";
import { headcountByDepartment } from "@/components/features/hr/staff";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { EmptyState, Panel } from "@/components/features/Panel";
import { can } from "@/lib/permissions";
import { departmentLabel, percent, plural } from "@/lib/format";
import type { Role } from "@/lib/roles";

const HEADCOUNT_SERIES: Series[] = [
  { key: "onShift", label: "En service", color: "var(--success)" },
  { key: "offShift", label: "Hors service", color: "var(--text-muted)" },
];

/** Statistics, by permission: rooms and requests (everyone), room patterns, headcount. */
export function AnalyticsClient({
  role,
  rooms,
  tickets,
  staff,
  departments,
}: {
  role: Role;
  rooms: HotelRoom[];
  tickets: Reclamation[];
  staff: Staff[];
  departments: Department[];
}) {
  const router = useRouter();
  const openRoom = useCallback((room: HotelRoom) => router.push(`/rooms/${room.room_number}`, { scroll: false }), [router]);

  return (
    <>
      {can(role, "analytics.staff") && <Headcount staff={staff} departments={departments} />}

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <RoomStatusPanel rooms={rooms} />
        <Panel title="Demandes par service" description="Ouvertes et résolues, services les plus sollicités en premier" icon={<ChartColumn />}>
          <TicketsByDepartmentChart tickets={tickets} />
        </Panel>
      </div>

      {can(role, "analytics.rooms") && <AnalyticsView active rooms={rooms} tickets={tickets} onOpenRoom={openRoom} />}
    </>
  );
}

function Headcount({ staff, departments }: { staff: Staff[]; departments: Department[] }) {
  const names = useMemo(() => new Map(departments.map((d) => [d.code, d.name])), [departments]);
  const name = useCallback((code: string) => names.get(code) ?? departmentLabel(code), [names]);
  const headcount = useMemo(() => headcountByDepartment(staff, name), [staff, name]);
  const onShift = staff.filter((s) => s.shift_status === "ON_SHIFT").length;
  const largest = headcount[0];

  return (
    <>
      <KpiGrid>
        <Kpi label="Effectif total" value={staff.length} icon={<Users />} />
        <Kpi label="En service" value={onShift} hint={`${percent(onShift, staff.length)} du personnel`} tone="success" icon={<UserCheck />} />
        <Kpi label="Services pourvus" value={headcount.length} hint={`sur ${plural(departments.length, "service")}`} icon={<Building2 />} />
        <Kpi
          label="Service le plus important"
          value={largest ? largest.label : "–"}
          hint={largest ? plural(largest.values.onShift + largest.values.offShift, "employé") : "Aucun employé pour l’instant"}
          icon={<ChartColumn />}
        />
      </KpiGrid>
      <Panel title="Effectif par service" description="Employés en service et hors service" icon={<ChartColumn />}>
        {headcount.length > 0 ? (
          <RankedBreakdown rows={headcount} series={HEADCOUNT_SERIES} label="Effectif du personnel par service" unit={["employé", "employés"]} />
        ) : (
          <EmptyState icon={<Users />} title="Aucun employé pour l’instant" description="L’effectif s’affichera dès que des employés auront été ajoutés." />
        )}
      </Panel>
    </>
  );
}
