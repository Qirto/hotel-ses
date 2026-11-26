/**
 * Gives every person in the database a Tunisian name, in place: staff, guests
 * (residents) and each service's head (one of that service's staff). Ids and links
 * (accounts, requests, rooms) are untouched. Deterministic: the same rows get the same
 * names on every run.
 *
 *   node scripts/tunisian_names.mjs
 *
 * Needs SUPABASE_SECRET_KEY in .env.local (see scripts/accounts_lib.mjs).
 */
import { adminClient } from "./accounts_lib.mjs";
import { FIRST_NAMES, LAST_NAMES } from "./tunisian_names_data.mjs";

const db = adminClient();

/** The i-th name of a fixed sequence that walks first and last names out of step, so names don't repeat until the lists run out. */
function nameAt(i) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[(i * 7 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
  return { first, last, full: `${first} ${last}` };
}

async function all(table, columns) {
  const { data, error } = await db.from(table).select(columns).order("id", { ascending: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function update(table, id, patch) {
  const { error } = await db.from(table).update(patch).eq("id", id);
  if (error) throw new Error(`${table} ${id}: ${error.message}`);
}

const staff = await all("staff", "id, department");
const used = new Set();
let n = 0;
const staffNames = new Map();
for (const s of staff) {
  let name = nameAt(n++);
  while (used.has(name.full)) name = nameAt(n++);
  used.add(name.full);
  staffNames.set(s.id, name.full);
  await update("staff", s.id, { full_name: name.full });
}

const residents = await all("residents", "id");
for (const [i, r] of residents.entries()) {
  const name = nameAt(i * 3 + 11); // another walk through the lists than the staff's
  await update("residents", r.id, { first_name: name.first, last_name: name.last });
}

// Head of each service: its first staff member when it has one, a name of its own otherwise.
const departments = await all("departments", "id, code");
for (const [i, d] of departments.entries()) {
  const member = staff.find((s) => s.department === d.code);
  const head = member ? staffNames.get(member.id) : nameAt(1000 + i).full;
  await update("departments", d.id, { head_of_department: head });
}

console.log(`Renamed ${staff.length} staff, ${residents.length} guests, ${departments.length} heads of service.`);
