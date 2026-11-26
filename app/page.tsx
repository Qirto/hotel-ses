import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { homeFor } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Entry point: the role's home page, or the login page (the proxy normally redirects first). */
export default async function Page() {
  const session = await getSession();
  redirect(session ? homeFor(session.role) : "/login");
}
