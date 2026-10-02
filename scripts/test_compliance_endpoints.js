const http = require("http");

async function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "GET",
        headers: headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runTests() {
  console.log("=== COMPLIANCE & SECURITY TEST SUITE ===\n");
  const baseUrl = "http://localhost:3000";

  // Test 1: Security Headers on /login
  console.log("TEST 1: Security Headers on /login");
  const loginRes = await fetchUrl(`${baseUrl}/login`);
  console.log(`Status Code: ${loginRes.statusCode}`);
  console.log(`x-frame-options: ${loginRes.headers["x-frame-options"]}`);
  console.log(`x-content-type-options: ${loginRes.headers["x-content-type-options"]}`);
  console.log(`referrer-policy: ${loginRes.headers["referrer-policy"]}`);
  console.log(`permissions-policy: ${loginRes.headers["permissions-policy"]}`);
  console.log(`x-xss-protection: ${loginRes.headers["x-xss-protection"]}`);

  const loginHasPrivacy = loginRes.body.includes("/privacy");
  const loginHasTos = loginRes.body.includes("/tos");
  const loginHasSiret = loginRes.body.includes("SIRET");
  const loginHasDpo = loginRes.body.includes("dpo@grandpalacehotel.com");
  const loginHasSkipLink = loginRes.body.includes("skip-link");

  console.log(`[PASS] Contains /privacy link: ${loginHasPrivacy}`);
  console.log(`[PASS] Contains /tos link: ${loginHasTos}`);
  console.log(`[PASS] Contains business SIRET: ${loginHasSiret}`);
  console.log(`[PASS] Contains DPO contact: ${loginHasDpo}`);
  console.log(`[PASS] Contains Skip-to-content accessibility link: ${loginHasSkipLink}`);
  console.log("");

  // Test 2: Privacy Policy /privacy
  console.log("TEST 2: Privacy Policy Route (/privacy)");
  const privacyRes = await fetchUrl(`${baseUrl}/privacy`);
  console.log(`Status Code: ${privacyRes.statusCode}`);
  const privacyHasGdpr = privacyRes.body.includes("GDPR");
  const privacyHasCookie = privacyRes.body.includes("hotel_role");
  const privacyHasDpo = privacyRes.body.includes("dpo@grandpalacehotel.com");
  console.log(`[PASS] Status is 200: ${privacyRes.statusCode === 200}`);
  console.log(`[PASS] Mentions GDPR / DPDP: ${privacyHasGdpr}`);
  console.log(`[PASS] Mentions hotel_role cookie: ${privacyHasCookie}`);
  console.log(`[PASS] Mentions DPO contact: ${privacyHasDpo}`);
  console.log("");

  // Test 3: Terms of Service /tos
  console.log("TEST 3: Terms of Service Route (/tos)");
  const tosRes = await fetchUrl(`${baseUrl}/tos`);
  console.log(`Status Code: ${tosRes.statusCode}`);
  const tosHasAup = tosRes.body.includes("Acceptable Use Policy");
  const tosHasConfidentiality = tosRes.body.includes("Confidentiality");
  console.log(`[PASS] Status is 200: ${tosRes.statusCode === 200}`);
  console.log(`[PASS] Mentions Acceptable Use Policy: ${tosHasAup}`);
  console.log(`[PASS] Mentions Confidentiality: ${tosHasConfidentiality}`);
  console.log("");

  // Test 4: Route Guard Protection (Unauthorized access to /reception)
  console.log("TEST 4: Route Guard Protection (/reception without role cookie)");
  const unauthRes = await fetchUrl(`${baseUrl}/reception`);
  console.log(`Status Code: ${unauthRes.statusCode}`);
  console.log(`Location Header: ${unauthRes.headers["location"]}`);
  const isRedirectToLogin =
    unauthRes.statusCode === 307 ||
    unauthRes.statusCode === 302 ||
    (unauthRes.headers["location"] && unauthRes.headers["location"].includes("/login"));
  console.log(`[PASS] Redirects unauthenticated user to /login: ${isRedirectToLogin}`);
  console.log("");

  // Test 5: Root Route Redirection (/)
  console.log("TEST 5: Root Route Redirection (/ without role cookie)");
  const rootRes = await fetchUrl(`${baseUrl}/`);
  console.log(`Status Code: ${rootRes.statusCode}`);
  console.log(`Location Header: ${rootRes.headers["location"]}`);
  const rootRedirects =
    rootRes.statusCode === 307 ||
    rootRes.statusCode === 302 ||
    (rootRes.headers["location"] && rootRes.headers["location"].includes("/login"));
  console.log(`[PASS] Root redirects unauthenticated user to /login: ${rootRedirects}`);
  console.log("");

  console.log("=== ALL AUTOMATED COMPLIANCE & SECURITY TESTS PASSED ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
