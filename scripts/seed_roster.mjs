/**
 * Gives every employee without a saved week the starting pattern (scripts/roster_storage.mjs).
 * Never overwrites a saved week. Creates the private Storage bucket if needed.
 *
 *   node scripts/seed_roster.mjs
 *
 * Needs SUPABASE_SECRET_KEY in .env.local.
 */
import { adminClient } from "./accounts_lib.mjs";
import { ensureRosterBucket, savedRosterIds, startingWeek, writeWeek } from "./roster_storage.mjs";

const db = adminClient();
await ensureRosterBucket(db);
const saved = await savedRosterIds(db);

const { data: staff, error } = await db.from("staff").select("id, role").order("id", { ascending: true });
if (error) throw new Error(`read staff: ${error.message}`);

let written = 0;
for (const [index, s] of staff.entries()) {
  if (saved.has(s.id)) continue;
  await writeWeek(db, s.id, startingWeek(index, s.role));
  written++;
}
console.log(`Planning enregistré pour ${written} employé(s) ; ${staff.length - written} avaient déjà le leur.`);
