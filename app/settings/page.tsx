import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalRole } from "@/lib/server/session";
import { SettingsView } from "@/components/features/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Hotel SES" };

/** Settings for whoever is signed in (any portal). The proxy also guards this route. */
export default async function SettingsPage() {
  const role = await getPortalRole();
  if (!role) redirect("/login");
  return <SettingsView role={role} />;
}
