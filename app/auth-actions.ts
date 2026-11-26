"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authEmail, normalizeUsername, passwordProblem } from "@/lib/accounts";
import { isRole } from "@/lib/roles";
import { homeFor, PASSWORD_PATH } from "@/lib/routes";
import { db } from "@/lib/server/actions-kit";
import { getSession } from "@/lib/server/session";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Sign-in, sign-out and password change for personal accounts (Supabase Auth).
 * Form actions (useActionState): they work before hydration, and the password
 * never ends up in a URL.
 */

export type FormState = { error: string } | null;

const WRONG_CREDENTIALS = "Identifiant ou mot de passe incorrect.";

export async function signInWithForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Saisissez votre identifiant et votre mot de passe." };

  const supabase = await db();
  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail(username), password });
  if (error || !data.user) {
    // same answer for unknown user and wrong password; a disabled account says so
    return { error: error?.code === "user_banned" ? "Ce compte est désactivé. Contactez l’administrateur." : WRONG_CREDENTIALS };
  }
  const app = data.user.app_metadata ?? {};
  if (!isRole(app.role)) {
    await supabase.auth.signOut();
    return { error: "Ce compte n’a accès à aucun espace. Contactez l’administrateur." };
  }
  revalidatePath("/", "layout");
  redirect(app.must_change_password === true ? PASSWORD_PATH : homeFor(app.role));
}

export async function signOut() {
  const supabase = await db();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true as const };
}

/**
 * Changes the signed-in account's password. A temporary password (first sign-in,
 * reset by the admin) needs no current password; a voluntary change does.
 */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await db();
  if (!session.mustChangePassword) {
    if (!current) return { error: "Saisissez votre mot de passe actuel." };
    if (current === next) return { error: "Choisissez un mot de passe différent de l’actuel." };
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail(session.username), password: current });
    if (error) return { error: "Mot de passe actuel incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: next });
  if (updateError) {
    console.error("Failed to change password:", updateError);
    return { error: updateError.code === "same_password" ? "Choisissez un mot de passe différent de l’actuel." : "Impossible de changer le mot de passe." };
  }

  if (session.mustChangePassword) {
    // clear the flag where only the server can write it, then refresh the session's claims
    const admin = createAdminClient();
    const { data: user, error: readError } = await admin.auth.admin.getUserById(session.userId);
    if (readError || !user.user) return { error: "Mot de passe changé, mais le compte n’a pas pu être mis à jour." };
    await admin.auth.admin.updateUserById(session.userId, { app_metadata: { ...user.user.app_metadata, must_change_password: false } });
    await admin.from("profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", session.userId);
    await supabase.auth.refreshSession();
  }

  revalidatePath("/", "layout");
  redirect(homeFor(session.role));
}
