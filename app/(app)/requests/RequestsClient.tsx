"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Department, Reclamation } from "@/utils/roomsData";
import { useTicketActions } from "@/components/features/TicketActions";
import { TicketsView } from "@/components/features/views/TicketsView";
import { useHotelState } from "@/hooks/useHotelState";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { can } from "@/lib/permissions";
import { departmentLabel } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/lib/roles";

const NO_ROOMS: never[] = [];

/** The requests list; the role's buttons follow its permissions, a request opens at /requests/<id>. */
export function RequestsClient({ role, tickets, departments }: { role: Role; tickets: Reclamation[]; departments: Department[] }) {
  const router = useRouter();
  const p = useHotelState({ rooms: NO_ROOMS, reclamations: tickets });
  const mutations = useTicketMutations(p, ROLE_LABEL[role]);
  const actions = useTicketActions({
    pending: p.isPending,
    onAcknowledge: can(role, "requests.acknowledge") ? mutations.acknowledge : undefined,
    onResolve: can(role, "requests.resolve") ? mutations.resolve : undefined,
  });

  const names = useMemo(() => new Map(departments.map((d) => [d.code, d.name])), [departments]);
  const departmentName = useCallback((code: string) => names.get(code) ?? departmentLabel(code), [names]);
  const codes = useMemo(() => departments.map((d) => d.code), [departments]);
  const open = useCallback((t: Reclamation) => router.push(`/requests/${t.id}`, { scroll: false }), [router]);

  return <TicketsView tickets={p.tickets} actions={actions} departments={codes} departmentName={departmentName} onOpenTicket={open} canEdit={can(role, "requests.edit")} />;
}
