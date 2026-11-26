import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftType } from "@/lib/constants";
import type { RosterEntry } from "@/utils/roomsData";

/**
 * The weekly roster, saved in Supabase Storage (no table needed): a private bucket with
 * one small JSON file per employee, `roster/<staffId>.json` = { "1": "MORNING", … "7": "OFF" }
 * (ISO weekdays, 1 = lundi). One file per employee keeps concurrent edits of different
 * people independent. Read and written with the secret key, so callers must check the
 * role first (staff.manage): the staff layout and setRosterShift do.
 * Same format as scripts/roster_storage.mjs (seeding).
 */
export const ROSTER_BUCKET = "hotel-data";
const DIR = "roster";
const SHIFTS: readonly ShiftType[] = ["MORNING", "EVENING", "NIGHT", "OFF"];

type Week = Partial<Record<string, ShiftType>>;
const path = (staffId: number) => `${DIR}/${staffId}.json`;
const isNotFound = (error: { message?: string; statusCode?: string | number } | null) =>
  !!error && (String(error.statusCode) === "404" || /not found/i.test(error.message ?? ""));

async function readWeek(db: ReturnType<typeof createAdminClient>, staffId: number): Promise<Week> {
  const { data, error } = await db.storage.from(ROSTER_BUCKET).download(path(staffId));
  if (isNotFound(error)) return {};
  if (error || !data) throw new Error(`Could not read the roster of staff ${staffId}: ${error?.message}`);
  return JSON.parse(await data.text()) as Week;
}

/** Every saved shift. An empty or missing bucket means nothing planned yet. */
export async function loadRoster(): Promise<RosterEntry[]> {
  const db = createAdminClient();
  const { data: files, error } = await db.storage.from(ROSTER_BUCKET).list(DIR, { limit: 1000 });
  if (isNotFound(error)) return [];
  if (error || !files) throw new Error(`Could not list the roster: ${error?.message}`);

  const ids = files.map((f) => Number(f.name.replace(/\.json$/, ""))).filter((id) => Number.isSafeInteger(id) && id > 0);
  const weeks = await Promise.all(ids.map(async (id) => [id, await readWeek(db, id)] as const));
  return weeks.flatMap(([staffId, week]) =>
    Object.entries(week)
      .filter((e): e is [string, ShiftType] => SHIFTS.includes(e[1] as ShiftType) && Number(e[0]) >= 1 && Number(e[0]) <= 7)
      .map(([weekday, shift]) => ({ staff_id: staffId, weekday: Number(weekday), shift }))
  );
}

/** Saves one cell, creating the private bucket on first use. */
export async function saveRosterShift(staffId: number, weekday: number, shift: ShiftType): Promise<void> {
  const db = createAdminClient();
  const { error: bucketError } = await db.storage.createBucket(ROSTER_BUCKET, { public: false });
  if (bucketError && !/already exists/i.test(bucketError.message)) throw new Error(`Could not create the roster storage: ${bucketError.message}`);

  const week = { ...(await readWeek(db, staffId)), [weekday]: shift };
  const body = new Blob([JSON.stringify(week)], { type: "application/json" });
  const { error } = await db.storage.from(ROSTER_BUCKET).upload(path(staffId), body, { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`Could not save the roster of staff ${staffId}: ${error.message}`);
}

/** Removes a deleted employee's roster. */
export async function deleteRosterOf(staffId: number): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.storage.from(ROSTER_BUCKET).remove([path(staffId)]);
  if (error && !isNotFound(error)) throw new Error(`Could not delete the roster of staff ${staffId}: ${error.message}`);
}
