/**
 * Compliance and access checks against a running Hotel SES (no session needed):
 * security headers, the legal pages and their content, links from the login page,
 * and that app pages send visitors without a session to /login.
 *
 *   node scripts/test_compliance_endpoints.js [base URL]     default http://localhost:3000
 *
 * Exits with code 1 when a check fails.
 */
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

let failures = 0;
function check(label, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
}

/** GET without following redirects, so a redirect to /login can be checked. */
async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

async function main() {
  console.log(`Hotel SES compliance checks against ${BASE}\n`);

  console.log("Security headers (/login)");
  const login = await get("/login");
  const expected = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
  for (const [name, value] of Object.entries(expected)) check(name, login.headers.get(name) === value, login.headers.get(name) ?? "missing");

  console.log("\nLogin page");
  check("status 200", login.status === 200, String(login.status));
  check("links to /privacy", login.body.includes('href="/privacy"'));
  check("links to /tos", login.body.includes('href="/tos"'));

  console.log("\nPrivacy policy (/privacy)");
  const privacy = await get("/privacy");
  check("status 200", privacy.status === 200, String(privacy.status));
  for (const text of ["2004-63", "INPDP", "sb-…-auth-token", "Supabase", "Vercel", "contact@hotelmediterraneehammamet.com"]) check(`mentions ${text}`, privacy.body.includes(text));
  check("links to /tos", privacy.body.includes('href="/tos"'));

  console.log("\nTerms of use (/tos)");
  const tos = await get("/tos");
  check("status 200", tos.status === 200, String(tos.status));
  for (const text of ["Réception", "Ressources humaines", "Direction", "Administrateur", "mot de passe temporaire"]) check(`mentions ${text}`, tos.body.includes(text));
  check("links to /privacy", tos.body.includes('href="/privacy"'));

  console.log("\nAccess without a session");
  for (const path of ["/", "/dashboard", "/rooms", "/requests", "/staff", "/analytics", "/admin/accounts", "/settings"]) {
    const res = await get(path);
    const location = res.headers.get("location") ?? "";
    check(`${path} redirects to /login`, res.status >= 300 && res.status < 400 && new URL(location, BASE).pathname === "/login", `${res.status} ${location || "no location"}`);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`Could not reach ${BASE}: ${err.message}`);
  process.exit(1);
});
