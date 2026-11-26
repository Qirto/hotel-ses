import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { NoticeProvider } from "@/components/app/notice";
import { QuickDispatchProvider } from "@/components/app/QuickDispatch";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { getSession } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { countOpenTickets, countRoomsNeedingAttention } from "@/lib/tickets";
import { loadHotelData } from "@/utils/loadHotelData";

export const dynamic = "force-dynamic";

/**
 * The app for every role: one shell (menu from lib/routes.ts), messages that survive
 * navigation, one live-updates subscription, and the front desk's quick forms for
 * roles that dispatch. `modal` is the parallel slot for room and request details
 * opened over the current page.
 */
export default async function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Menu badges (and the room list the quick forms look numbers up in).
  const { rooms, reclamationsList, isLiveSupabase } = await loadHotelData({ rooms: true, tickets: true });
  const badges = { attention: countRoomsNeedingAttention(rooms, reclamationsList), open: countOpenTickets(reclamationsList) };

  const page = (
    <AppShell role={session.role} badges={badges}>
      {children}
      {modal}
    </AppShell>
  );

  return (
    <NoticeProvider>
      {can(session.role, "requests.dispatch") ? <QuickDispatchProvider rooms={rooms}>{page}</QuickDispatchProvider> : page}
      <RealtimeRefresh enabled={isLiveSupabase} />
    </NoticeProvider>
  );
}
