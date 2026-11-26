import "server-only";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { PORTALS } from "@/lib/portals";

/**
 * Helpers shared by the server-action files. Kept out of "use server" files on
 * purpose: every exported async function there is a public endpoint.
 */

/** Supabase client bound to this request's cookies (the signed-in user's session). */
export async function db() {
  return createClient(await cookies());
}

export type Db = Awaited<ReturnType<typeof db>>;

/** Standard success result; `data` is the written row when the caller needs it. */
export function ok<T = undefined>(data?: T) {
  return { success: true as const, data: data as T, error: undefined };
}

/** Logs a failed write and returns the standard failure result. */
export function failed(what: string, error: { message: string }) {
  console.error(`Failed to ${what}:`, error);
  return { success: false as const, error: error.message };
}

/** A refusal with a message for people (validation, business rule). */
export const refuse = (error: string) => ({ success: false as const, error });

/** Portal pages are dynamic; this refreshes their client router cache after a write. */
export function revalidatePortals() {
  for (const portal of Object.values(PORTALS)) revalidatePath(portal.path);
}
