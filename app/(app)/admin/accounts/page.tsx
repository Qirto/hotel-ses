import type { Metadata } from "next";
import { requireRoute } from "@/lib/server/session";
import { loadAccounts } from "@/lib/server/accounts";
import { loadHotelData } from "@/utils/loadHotelData";
import { AccountsClient } from "./AccountsClient";

export const metadata: Metadata = { title: "Comptes · Hotel SES" };

export default async function AccountsPage() {
  const session = await requireRoute("/admin/accounts");
  const [accounts, { staffList }] = await Promise.all([loadAccounts(), loadHotelData({ staff: true })]);
  return <AccountsClient accounts={accounts} staff={staffList} currentUserId={session.userId} />;
}
