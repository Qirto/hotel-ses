import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Mot de passe · Hotel SES" };
export const dynamic = "force-dynamic";

/** Change the signed-in account's password: required after a temporary one, optional otherwise. */
export default async function PasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <PasswordForm temporary={session.mustChangePassword} username={session.username} />;
}
