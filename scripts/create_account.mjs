/**
 * Creates one account. Use it once to create the first administrator; afterwards the
 * admin creates accounts from the Administration space.
 *
 *   node scripts/create_account.mjs --username a.admin --role admin --name "Prénom Nom"
 *
 * The temporary password is printed once, in your terminal only. The person chooses
 * their own at first sign-in.
 */
import { adminClient, createAccount, ROLES } from "./accounts_lib.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split(/\s*--/)
    .filter(Boolean)
    .map((pair) => {
      const [key, ...rest] = pair.split(" ");
      return [key, rest.join(" ").replace(/^"|"$/g, "")];
    })
);

if (!args.username || !args.role || !args.name) {
  console.error(`Usage: node scripts/create_account.mjs --username <name> --role <${ROLES.join("|")}> --name "<display name>"`);
  process.exit(1);
}

const result = await createAccount(adminClient(), { username: args.username, role: args.role, displayName: args.name });
if (!result.created) {
  console.error(`Not created: ${result.reason}`);
  process.exit(1);
}
console.log(`Account "${args.username.toLowerCase()}" (${args.role}) created.`);
console.log(`Temporary password (shown once): ${result.password}`);
