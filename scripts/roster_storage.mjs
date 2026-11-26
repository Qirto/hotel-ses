/**
 * The saved weekly roster for scripts: same format as lib/server/roster.ts (private
 * Storage bucket "hotel-data", one file per employee, roster/<staffId>.json =
 * { "1": "MORNING", … "7": "OFF" }, ISO weekdays). Keep the two in step.
 */
export const ROSTER_BUCKET = "hotel-data";

/**
 * Starting pattern, by position in the staff list (ordered by id) and job: two days off a
 * week, front desk and housekeeping alternating morning and evening, security and
 * maintenance with a night every third day, everyone else on mornings.
 */
export function startingWeek(index, role) {
  const week = {};
  for (let d = 0; d < 7; d++) {
    week[d + 1] =
      (index + d) % 7 === 0 || (index + d) % 7 === 6
        ? "OFF"
        : ["receptionist", "housekeeper"].includes(role)
          ? d % 2 === 0 ? "MORNING" : "EVENING"
          : ["security_officer", "maintenance"].includes(role)
            ? d % 3 === 0 ? "NIGHT" : "MORNING"
            : "MORNING";
  }
  return week;
}

/** Creates the private bucket if it is missing. */
export async function ensureRosterBucket(db) {
  const { error } = await db.storage.createBucket(ROSTER_BUCKET, { public: false });
  if (error && !/already exists/i.test(error.message)) throw new Error(`create bucket: ${error.message}`);
}

/** Ids of the employees that already have a saved week. */
export async function savedRosterIds(db) {
  const { data, error } = await db.storage.from(ROSTER_BUCKET).list("roster", { limit: 1000 });
  if (error) throw new Error(`list roster: ${error.message}`);
  return new Set(data.map((f) => Number(f.name.replace(/\.json$/, ""))));
}

export async function writeWeek(db, staffId, week) {
  const body = new Blob([JSON.stringify(week)], { type: "application/json" });
  const { error } = await db.storage.from(ROSTER_BUCKET).upload(`roster/${staffId}.json`, body, { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`write roster ${staffId}: ${error.message}`);
}
