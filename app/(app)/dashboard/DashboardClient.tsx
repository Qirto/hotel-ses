"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ConciergeBell, History, Hotel, Send, Sparkles, Timer, TriangleAlert } from "lucide-react";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { useQuickDispatch } from "@/components/app/QuickDispatch";
import { Button } from "@/components/ui/button";
import { Kpi, KpiGrid } from "@/components/features/Kpi";
import { Panel } from "@/components/features/Panel";
import { useTicketActions } from "@/components/features/TicketActions";
import { RoomStatusPanel } from "@/components/features/charts/RoomStatusChart";
import { TicketsByDepartmentChart } from "@/components/features/charts/TicketsByDepartmentChart";
import { UrgentTicketsPanel } from "@/components/features/views/UrgentTicketsPanel";
import { useHotelState } from "@/hooks/useHotelState";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { averageResolutionMinutes, isUrgentOpenTicket } from "@/lib/tickets";
import { roomStatusCounts } from "@/lib/rooms";
import { formatMinutes, percent, plural } from "@/lib/format";

/**
 * Home page. Front desk (Reception): quick actions, today's room counts, urgent
 * requests. Management (Direction, admin): occupancy, resolution and urgent requests.
 * Every number links to the matching filtered list.
 */
export function DashboardClient({ role, rooms, tickets }: { role: Role; rooms: HotelRoom[]; tickets: Reclamation[] }) {
  const router = useRouter();
  const p = useHotelState({ rooms, reclamations: tickets });
  const mutations = useTicketMutations(p, role === "reception" ? "Réception" : "Direction");
  const actions = useTicketActions({
    pending: p.isPending,
    onAcknowledge: can(role, "requests.acknowledge") ? mutations.acknowledge : undefined,
    onResolve: can(role, "requests.resolve") ? mutations.resolve : undefined,
  });

  const counts = useMemo(() => roomStatusCounts(p.liveRooms), [p.liveRooms]);
  const urgent = useMemo(() => p.tickets.filter(isUrgentOpenTicket), [p.tickets]);
  const go = (href: string) => () => router.push(href);
  const openRequest = (t: Reclamation) => router.push(`/requests/${t.id}`);

  const urgentPanel = (
    <UrgentTicketsPanel
      title="Demandes urgentes"
      description={`${plural(urgent.length, "demande ouverte", "demandes ouvertes")} en priorité urgente ou haute`}
      tickets={urgent.slice(0, 5)}
      actions={actions}
      onViewAll={go("/requests")}
      onOpenTicket={openRequest}
    />
  );

  if (role === "reception") return <FrontDesk p={p} counts={counts} urgentCount={urgent.length} go={go} urgentPanel={urgentPanel} />;

  const mttr = averageResolutionMinutes(p.tickets);
  return (
    <>
      <KpiGrid>
        <Kpi label="Taux d’occupation" value={percent(counts.occupied, p.liveRooms.length)} hint={`${counts.occupied} sur ${plural(p.liveRooms.length, "chambre")}`} icon={<Hotel />} onClick={go("/rooms?status=OCCUPIED")} />
        <Kpi label="Prêtes à la vente" value={counts.vacantClean} hint="Libres et propres" tone="success" icon={<Sparkles />} onClick={go("/rooms?status=VACANT_CLEAN")} />
        <Kpi label="À traiter" value={p.attentionCount} hint="À nettoyer ou demande ouverte" tone={p.attentionCount ? "warning" : "neutral"} icon={<TriangleAlert />} onClick={go("/rooms?status=ATTENTION")} />
        <Kpi
          label="Demandes ouvertes"
          value={p.openCount}
          hint={mttr != null ? `Résolution moyenne : ${formatMinutes(mttr)}` : "Aucune demande résolue pour l’instant"}
          tone={p.openCount ? "danger" : "neutral"}
          icon={<ClipboardList />}
          onClick={go("/requests")}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <RoomStatusPanel rooms={p.liveRooms} />
        <Panel title="Résolution" description="Demandes clôturées et délai de résolution" icon={<Timer />}>
          <KpiGrid columns={2}>
            <Kpi label="Résolues" value={percent(p.tickets.length - p.openCount, p.tickets.length)} hint={plural(p.tickets.length, "demande")} tone="success" />
            <Kpi label="Délai moyen de résolution" value={formatMinutes(mttr)} hint="Demandes résolues" />
          </KpiGrid>
          <div className="mt-5">
            <TicketsByDepartmentChart tickets={p.tickets} />
          </div>
        </Panel>
      </div>

      {urgentPanel}
    </>
  );
}

function FrontDesk({
  p,
  counts,
  urgentCount,
  go,
  urgentPanel,
}: {
  p: ReturnType<typeof useHotelState>;
  counts: ReturnType<typeof roomStatusCounts>;
  urgentCount: number;
  go: (href: string) => () => void;
  urgentPanel: React.ReactNode;
}) {
  const quick = useQuickDispatch();
  return (
    <>
      {quick && (
        <Panel title="Réception" description="État des chambres en direct, demandes des clients et transmission aux services." icon={<ConciergeBell />}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" size="lg" onClick={quick.openDispatch} leftIcon={<Send className="size-4" aria-hidden />} className="justify-center">
              Créer la demande
            </Button>
            <Button variant="outline" size="lg" onClick={quick.openBackfill} leftIcon={<History className="size-4" aria-hidden />} className="justify-center">
              Incident passé
            </Button>
          </div>
        </Panel>
      )}

      <KpiGrid>
        <Kpi label="Chambres occupées" value={counts.occupied} hint={`${percent(counts.occupied, p.liveRooms.length)} sur ${plural(p.liveRooms.length, "chambre")}`} icon={<Hotel />} onClick={go("/rooms?status=OCCUPIED")} />
        <Kpi label="Libres et propres" value={counts.vacantClean} hint="Prêtes pour l’arrivée" tone="success" icon={<Sparkles />} onClick={go("/rooms?status=VACANT_CLEAN")} />
        <Kpi label="Chambres à nettoyer" value={counts.dirty} hint="En attente de la gouvernance" tone={counts.dirty ? "danger" : "neutral"} icon={<TriangleAlert />} onClick={go("/rooms?status=DIRTY")} />
        <Kpi label="Demandes ouvertes" value={p.openCount} hint={plural(urgentCount, "urgente")} tone={p.openCount ? "warning" : "neutral"} icon={<ClipboardList />} onClick={go("/requests")} />
      </KpiGrid>

      {urgentPanel}
    </>
  );
}
