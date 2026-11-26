import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { SettingsView } from "@/components/features/settings/SettingsView";

export const metadata: Metadata = { title: "Paramètres · Hotel SES" };

/** Settings for whoever is signed in (any role). The proxy also guards this route. */
export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <SettingsView role={session.role} username={session.username} displayName={session.displayName} />;
}
