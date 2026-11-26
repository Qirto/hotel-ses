/**
 * Demo accounts for client presentations: one per role, linked to a demo employee
 * of the matching service when one exists. Additive: existing usernames are skipped.
 *
 *   npm run seed:accounts
 *
 * Passwords are written only to demo-accounts.local.txt (gitignored), never printed.
 */
import { writeFileSync } from "node:fs";
import { adminClient, createAccount } from "./accounts_lib.mjs";

const DEMO = [
  { username: "demo.reception", role: "reception", displayName: "Démo Réception", staffRole: "receptionist" },
  { username: "demo.rh", role: "rh", displayName: "Démo RH", staffRole: "hr_specialist" },
  { username: "demo.direction", role: "gm", displayName: "Démo Direction", staffRole: "manager" },
  { username: "demo.admin", role: "admin", displayName: "Démo Administration", staffRole: null },
];

const admin = adminClient();
const lines = [];
for (const d of DEMO) {
  let staffId = null;
  if (d.staffRole) {
    const { data } = await admin.from("staff").select("id").eq("role", d.staffRole).order("id").limit(1).maybeSingle();
    staffId = data?.id ?? null;
  }
  const result = await createAccount(admin, { username: d.username, role: d.role, displayName: d.displayName, staffId });
  if (result.created) {
    lines.push(`${d.username}\t${d.role}\t${result.password}`);
    console.log(`created ${d.username} (${d.role})`);
  } else console.log(`skipped ${d.username}: ${result.reason}`);
}

if (lines.length) {
  writeFileSync("demo-accounts.local.txt", ["# username\trole\ttemporary password (changed at first sign-in)", ...lines, ""].join("\n"));
  console.log("Temporary passwords written to demo-accounts.local.txt (gitignored).");
}
