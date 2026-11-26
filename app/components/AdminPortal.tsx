"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Building2, DoorOpen, LayoutGrid, Map as MapIcon, Users, UsersRound } from "lucide-react";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import type { Account } from "@/lib/server/accounts";
import AppShell from "@/components/app/AppShell";
import { navItem, sharedNavItems, type NavTabItem } from "@/components/app/nav";
import { withNotices } from "@/components/app/notice";
import { TabPanel } from "@/components/app/TabPanel";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel, PageStack } from "@/components/features/Panel";
import { PortalRoomDetail } from "@/components/features/PortalRoomDetail";
import { useTicketActions } from "@/components/features/TicketActions";
import { useTicketEditor } from "@/components/features/TicketEditSheet";
import { RoomsView } from "@/components/features/views/RoomsView";
import { TicketsView } from "@/components/features/views/TicketsView";
import { AccountsView } from "@/components/features/admin/AccountsView";
import { RoomInventoryView } from "@/components/features/admin/RoomInventoryView";
import { ServicesPanel, StaffDirectoryPanel } from "@/components/features/hr/panels";
import { usePortalState } from "@/hooks/usePortalState";
import { useAccounts } from "@/hooks/useAccounts";
import { useConfirm } from "@/hooks/useConfirm";
import { useDepartmentsCrud } from "@/hooks/useDepartmentsCrud";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useRoomControls } from "@/hooks/useRoomControls";
import { useRoomInventory } from "@/hooks/useRoomInventory";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";
import { useTicketMutations } from "@/hooks/useTicketMutations";
import { PORTALS } from "@/lib/portals";
import { plural } from "@/lib/format";

interface Props {
  rooms: HotelRoom[];
  reclamationsList: Reclamation[];
  staffList: Staff[];
  departmentsList: Department[];
  accountList: Account[];
  currentUserId: string;
  isLiveSupabase?: boolean;
}

type Tab = "ACCOUNTS" | "ROOMS" | "RECLAMATIONS" | "STAFF" | "PORTALS";
type RoomsTab = "PLAN" | "INVENTORY";
type StaffTab = "DIRECTORY" | "SERVICES";

/** Portals the admin can open, with what each is for. */
const PORTAL_LINKS = [
  { portal: PORTALS.reception, purpose: "Arrivées et départs, demandes des clients, état des chambres." },
  { portal: PORTALS.rh, purpose: "Annuaire, horaires, présence et services du personnel." },
  { portal: PORTALS.gm, purpose: "Tableau de bord, résolution des demandes et analyses." },
];

/**
 * Administration: accounts, room inventory, services, staff and requests, built on
 * the same features as the other portals (shared hooks), plus links into them.
 */
function AdminPortalView({ rooms, reclamationsList, staffList, departmentsList, accountList, currentUserId, isLiveSupabase = false }: Props) {
  const p = usePortalState<Tab>({ initialTab: "ACCOUNTS", rooms, reclamations: reclamationsList });
  const { activeTab, tickets, liveRooms, isPending, openRoom, openCount, attentionCount } = p;
  const [roomsTab, setRoomsTab] = useState<RoomsTab>("PLAN");
  const [staffTab, setStaffTab] = useState<StaffTab>("DIRECTORY");

  useRealtimeRefresh("realtime-admin", ["rooms", "reclamations", "staff", "departments"], isLiveSupabase);

  /* ───────────── shared features ───────────── */
  const confirm = useConfirm(p);
  const services = useDepartmentsCrud(p, departmentsList, confirm.ask);
  const people = useStaffDirectory(p, staffList, confirm.ask, services.options);
  const accounts = useAccounts(p, accountList, people.staff, confirm.ask);
  const inventory = useRoomInventory(p, confirm.ask);
  const ticketMutations = useTicketMutations(p, "Administration");
  const ticketActions = useTicketActions({ pending: isPending, onAcknowledge: ticketMutations.acknowledge, onResolve: ticketMutations.resolve });
  const ticketEditor = useTicketEditor(ticketMutations, people.staff, isPending);
  const roomControls = useRoomControls(p);

  /* ───────────── navigation ───────────── */
  const navItems = useMemo<NavTabItem[]>(
    () => [
      navItem(p, "ACCOUNTS", "Comptes", <UsersRound aria-hidden />, { badge: accounts.accounts.length, badgeTone: "neutral" }),
      ...sharedNavItems(p),
      navItem(p, "STAFF", "Personnel & services", <Users aria-hidden />, { shortLabel: "Personnel" }),
      navItem(p, "PORTALS", "Espaces", <LayoutGrid aria-hidden />),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, accounts.accounts.length, attentionCount, openCount, p.go]
  );

  return (
    <AppShell role="admin" items={navItems}>
      <PageStack>
        <TabPanel active={activeTab === "ACCOUNTS"}>
          <AccountsView
            accounts={accounts.accounts}
            staff={people.staff}
            currentUserId={currentUserId}
            pending={isPending}
            onAdd={accounts.openCreate}
            onEdit={accounts.openEdit}
            onReset={accounts.reset}
            onToggleActive={accounts.toggleActive}
            onRemove={accounts.remove}
          />
        </TabPanel>

        <TabPanel active={activeTab === "ROOMS"}>
          <AnimatedTabs
            tabs={[
              { id: "PLAN", label: "Plan", icon: <MapIcon className="size-4" aria-hidden /> },
              { id: "INVENTORY", label: "Inventaire", icon: <DoorOpen className="size-4" aria-hidden />, badge: liveRooms.length },
            ]}
            activeTab={roomsTab}
            onChange={(id) => setRoomsTab(id as RoomsTab)}
            renderContent={false}
            tabsContainerClassName="no-scrollbar max-w-full overflow-x-auto"
          />
          <TabPanel active={roomsTab === "PLAN"}>
            <RoomsView rooms={liveRooms} tickets={tickets} onSelectRoom={openRoom} filter={p.roomFilter} onFilterChange={p.setRoomFilter} />
          </TabPanel>
          <TabPanel active={roomsTab === "INVENTORY"}>
            <RoomInventoryView rooms={liveRooms} pending={isPending} onAdd={inventory.openCreate} onEdit={inventory.openEdit} onRemove={inventory.askRemove} />
          </TabPanel>
        </TabPanel>

        <TabPanel active={activeTab === "RECLAMATIONS"}>
          <TicketsView tickets={tickets} actions={ticketActions} departments={services.codes} departmentName={services.name} onOpenTicket={ticketEditor.openTicket} />
        </TabPanel>

        <TabPanel active={activeTab === "STAFF"}>
          <AnimatedTabs
            tabs={[
              { id: "DIRECTORY", label: "Annuaire", icon: <Users className="size-4" aria-hidden />, badge: people.rows.length },
              { id: "SERVICES", label: "Services", icon: <Building2 className="size-4" aria-hidden />, badge: services.departments.length },
            ]}
            activeTab={staffTab}
            onChange={(id) => setStaffTab(id as StaffTab)}
            renderContent={false}
            tabsContainerClassName="no-scrollbar max-w-full overflow-x-auto"
          />
          <TabPanel active={staffTab === "DIRECTORY"}>
            <StaffDirectoryPanel people={people} services={services} pending={isPending} />
          </TabPanel>
          <TabPanel active={staffTab === "SERVICES"}>
            <ServicesPanel services={services} staff={people.staff} pending={isPending} />
          </TabPanel>
        </TabPanel>

        <TabPanel active={activeTab === "PORTALS"}>
          <Panel title="Espaces" description={`Ouvrez ${plural(PORTAL_LINKS.length, "espace")} tel que leurs équipes le voient.`} icon={<LayoutGrid />}>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
              {PORTAL_LINKS.map(({ portal, purpose }) => (
                <li key={portal.role} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
                  <div>
                    <p className="font-medium">{portal.name}</p>
                    <p className="mt-1 text-sm text-fg-muted">{purpose}</p>
                  </div>
                  <ButtonLink href={portal.path} variant="secondary" size="touch" leftIcon={<ArrowRight className="size-4" aria-hidden />} className="mt-auto justify-center">
                    Ouvrir l’espace {portal.name}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </Panel>
        </TabPanel>
      </PageStack>

      <PortalRoomDetail p={p} tickets={ticketMutations} ticketActions={ticketActions} controls={roomControls} />

      {ticketEditor.editor}
      {accounts.elements}
      {inventory.formElement}
      {people.formElement}
      {services.formElement}
      {confirm.element}
    </AppShell>
  );
}

export default withNotices(AdminPortalView);
