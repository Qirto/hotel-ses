import { redirect } from "next/navigation";
import { getPortalRole } from "@/lib/server/session";
import { PORTALS } from "@/lib/portals";

export const dynamic = "force-dynamic";

/** Entry point: the signed-in portal, or the login page. */
export default async function Page() {
  const role = await getPortalRole();
  redirect(role ? PORTALS[role].path : "/login");
}
