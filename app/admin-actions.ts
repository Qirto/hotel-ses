"use server";

import { createHash, randomInt } from "node:crypto";
import { authEmail, isValidUsername, normalizeUsername, passwordProblem } from "@/lib/accounts";
import { isRole, type Role } from "@/lib/roles";
import { db, failed, ok, refuse, revalidateApp } from "@/lib/server/actions-kit";
import { deny, getSession } from "@/lib/server/session";
import type { Account } from "@/lib/server/accounts";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Administration: accounts and the room inventory (capabilities accounts.manage and
 * rooms.inventory: the admin only). Accounts go through the secret-key client: creating Auth
 * users and writing app_metadata (the role inside the signed session).
 */

// =====================================================================
// ACCOUNTS
// =====================================================================

/** Unambiguous characters (no 0/O, 1/l/I) so a temporary password can be read aloud. */
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 12 random characters with at least one letter and one digit. */
function temporaryPassword(): string {
  for (;;) {
    const value = Array.from({ length: 12 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
    if (!passwordProblem(value)) return value;
  }
}

export type AccountInput = { displayName: string; role: Role; staffId: number | null };

function checkInput(input: AccountInput) {
  if (!input.displayName.trim()) return refuse("Le nom affiché est obligatoire.");
  if (!isRole(input.role)) return refuse("Rôle non valide.");
  return null;
}

/** Active admins other than `exceptId`: an admin must always remain. */
async function otherActiveAdmins(admin: ReturnType<typeof createAdminClient>, exceptId: string) {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true).neq("id", exceptId);
  return count ?? 0;
}

/** Writes the fields the session carries (role, username, flag) where only the server can. */
async function setAppMetadata(admin: ReturnType<typeof createAdminClient>, id: string, patch: Record<string, unknown>) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) return error ?? { message: "Compte introuvable" };
  const { error: updateError } = await admin.auth.admin.updateUserById(id, { app_metadata: { ...data.user.app_metadata, ...patch } });
  return updateError;
}

/** Creates an account with a temporary password (shown once, changed at first sign-in). */
export async function createAccount(input: AccountInput & { username: string }) {
  const denied = await deny("accounts.manage");
  if (denied) return denied;
  const username = normalizeUsername(input.username);
  if (!isValidUsername(username)) return refuse("Identifiant non valide : 3 à 32 caractères, lettres minuscules, chiffres, point, tiret ou tiret bas.");
  const invalid = checkInput(input);
  if (invalid) return invalid;

  const admin = createAdminClient();
  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return refuse("Cet identifiant est déjà utilisé.");

  const password = temporaryPassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail(username),
    password,
    email_confirm: true,
    app_metadata: { role: input.role, username, must_change_password: true },
    user_metadata: { display_name: input.displayName.trim() },
  });
  if (error || !created.user) return failed("create account", error ?? { message: "Compte non créé" });

  const row = {
    id: created.user.id,
    username,
    display_name: input.displayName.trim(),
    role: input.role,
    staff_id: input.staffId,
    is_active: true,
    must_change_password: true,
  };
  const { data: profile, error: profileError } = await admin.from("profiles").insert(row).select("*").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id); // no half-created account
    return failed("create account profile", profileError);
  }
  return ok({ account: { ...(profile as Omit<Account, "last_sign_in_at">), last_sign_in_at: null } as Account, temporaryPassword: password });
}

/** Changes name, role and linked employee. The admin cannot demote itself or the last admin. */
export async function updateAccount(id: string, input: AccountInput) {
  const denied = await deny("accounts.manage");
  if (denied) return denied;
  const invalid = checkInput(input);
  if (invalid) return invalid;
  const session = await getSession();
  const admin = createAdminClient();

  const { data: current, error: readError } = await admin.from("profiles").select("role").eq("id", id).single();
  if (readError || !current) return failed("read account", readError ?? { message: "Compte introuvable" });
  if (current.role === "admin" && input.role !== "admin") {
    if (id === session?.userId) return refuse("Vous ne pouvez pas retirer votre propre rôle d’administrateur.");
    if ((await otherActiveAdmins(admin, id)) === 0) return refuse("Il doit toujours rester au moins un administrateur actif.");
  }

  const metaError = await setAppMetadata(admin, id, { role: input.role });
  if (metaError) return failed("update account role", metaError);
  await admin.auth.admin.updateUserById(id, { user_metadata: { display_name: input.displayName.trim() } });
  const { error } = await admin
    .from("profiles")
    .update({ display_name: input.displayName.trim(), role: input.role, staff_id: input.staffId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return failed("update account", error);
  return ok();
}

/** New temporary password (shown once); the person must change it at next sign-in. */
export async function resetAccountPassword(id: string) {
  const denied = await deny("accounts.manage");
  if (denied) return denied;
  const admin = createAdminClient();
  const password = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return failed("reset password", error);
  const metaError = await setAppMetadata(admin, id, { must_change_password: true });
  if (metaError) return failed("flag password change", metaError);
  await admin.from("profiles").update({ must_change_password: true, updated_at: new Date().toISOString() }).eq("id", id);
  return ok({ temporaryPassword: password });
}

/** Disables (sign-in refused) or re-enables an account. Never yourself, never the last admin. */
export async function setAccountActive(id: string, active: boolean) {
  const denied = await deny("accounts.manage");
  if (denied) return denied;
  const session = await getSession();
  const admin = createAdminClient();
  if (!active) {
    if (id === session?.userId) return refuse("Vous ne pouvez pas désactiver votre propre compte.");
    const { data: current } = await admin.from("profiles").select("role").eq("id", id).single();
    if (current?.role === "admin" && (await otherActiveAdmins(admin, id)) === 0) return refuse("Il doit toujours rester au moins un administrateur actif.");
  }
  // ~100 years: Supabase refuses sign-in for a banned user; "none" lifts it
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  if (error) return failed("change account status", error);
  await admin.from("profiles").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  return ok();
}

/** Deletes an account for good (the employee record, if linked, stays). */
export async function deleteAccount(id: string) {
  const denied = await deny("accounts.manage");
  if (denied) return denied;
  const session = await getSession();
  if (id === session?.userId) return refuse("Vous ne pouvez pas supprimer votre propre compte.");
  const admin = createAdminClient();
  const { data: current } = await admin.from("profiles").select("role").eq("id", id).single();
  if (current?.role === "admin" && (await otherActiveAdmins(admin, id)) === 0) return refuse("Il doit toujours rester au moins un administrateur actif.");
  const { error } = await admin.auth.admin.deleteUser(id); // the profile goes with it (on delete cascade)
  if (error) return failed("delete account", error);
  return ok();
}

// =====================================================================
// ROOM INVENTORY
// =====================================================================

const BLOCKS = ["BLOCK_A", "BLOCK_B"] as const;
export type RoomInput = { room_number: string; block: (typeof BLOCKS)[number] };

/** Door QR code: same rule as scripts/room_layout.js, so codes match the seed. */
const roomQrCode = (number: string, block: string) =>
  `QR-${number}-${createHash("sha256").update(`HOTEL_DOOR_${number}_${block}`).digest("hex").slice(0, 16)}`;

/** Floor from the number (1xxx = floor 1…), checked against the hotel's three floors. */
function checkRoom(input: RoomInput) {
  const number = input.room_number.trim();
  if (!/^[1-3]\d{3}$/.test(number)) return { valid: false as const, refusal: refuse("Numéro non valide : 4 chiffres, le premier est l’étage (1 à 3).") };
  if (number.endsWith("13")) return { valid: false as const, refusal: refuse("L’hôtel n’a pas de chambre se terminant par 13.") };
  if (!BLOCKS.includes(input.block)) return { valid: false as const, refusal: refuse("Bloc non valide.") };
  return { valid: true as const, number, floor: Number(number[0]) };
}

export async function createRoom(input: RoomInput) {
  const denied = await deny("rooms.inventory");
  if (denied) return denied;
  const checked = checkRoom(input);
  if (!checked.valid) return checked.refusal;
  const supabase = await db();
  const { data: taken } = await supabase.from("rooms").select("id").eq("room_number", checked.number).maybeSingle();
  if (taken) return refuse(`La chambre ${checked.number} existe déjà.`);
  const { data, error } = await supabase
    .from("rooms")
    .insert({ room_number: checked.number, floor: checked.floor, block: input.block, is_occupied: false, cleaning_status: "CLEAN", qr_code_hash: roomQrCode(checked.number, input.block) })
    .select("*")
    .single();
  if (error) return failed("create room", error);
  revalidateApp();
  return ok(data);
}

export async function updateRoom(id: number, input: RoomInput) {
  const denied = await deny("rooms.inventory");
  if (denied) return denied;
  const checked = checkRoom(input);
  if (!checked.valid) return checked.refusal;
  const supabase = await db();
  const { data: taken } = await supabase.from("rooms").select("id").eq("room_number", checked.number).neq("id", id).maybeSingle();
  if (taken) return refuse(`La chambre ${checked.number} existe déjà.`);
  const { error } = await supabase
    .from("rooms")
    .update({ room_number: checked.number, floor: checked.floor, block: input.block, qr_code_hash: roomQrCode(checked.number, input.block) })
    .eq("id", id);
  if (error) return failed("update room", error);
  revalidateApp();
  return ok();
}

/** Deletes a room, refused while it has requests or guests (their history would go with it). */
export async function deleteRoom(id: number) {
  const denied = await deny("rooms.inventory");
  if (denied) return denied;
  const supabase = await db();
  const [{ count: requests }, { count: guests }] = await Promise.all([
    supabase.from("reclamations").select("id", { count: "exact", head: true }).eq("room_id", id),
    supabase.from("residents").select("id", { count: "exact", head: true }).eq("room_id", id),
  ]);
  if (requests || guests)
    return refuse(
      `Cette chambre a ${[requests ? `${requests} demande${requests > 1 ? "s" : ""}` : "", guests ? `${guests} client${guests > 1 ? "s" : ""}` : ""].filter(Boolean).join(" et ")} : suppression impossible.`
    );
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) return failed("delete room", error);
  revalidateApp();
  return ok();
}
