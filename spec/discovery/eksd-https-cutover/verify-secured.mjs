// P59 live verification of the secured EKS-D deployment through the forwarded http://localhost:5173.
// Credentials come only from the environment (never printed). Writes touch only the synthetic topic kafka3o-m10-verify.
// Usage: KAFKA3O_ADMIN_PASSWORD=... KAFKA3O_OPERATOR_PASSWORD=... KAFKA3O_NOROLE_PASSWORD=... CHROMIUM=/path node verify-secured.mjs
import { chromium } from "playwright";

const base = "http://localhost:5173";
const topic = "kafka3o-m10-verify";
const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });

async function signedIn(username, password) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText(`Signed in as`).waitFor({ timeout: 15_000 });
  return { context, page };
}

// api runs a same-origin request inside the page, with CSRF on writes, exactly as the secured UI does.
const api = (page, method, path, body, reason) => page.evaluate(async ({ method, path, body, reason }) => {
  const csrf = document.cookie.split("; ").find((c) => c.startsWith("__Host-kafka3o_csrf="))?.split("=")[1] ?? "";
  const headers = { Accept: "application/json" };
  if (method !== "GET") headers["X-Kafka3O-CSRF"] = csrf;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (reason) headers["X-Kafka3O-Change-Reason"] = reason;
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin" });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: response.status, json, type: response.headers.get("content-type") ?? "" };
}, { method, path, body, reason });

// 1. Administrator: sign-in, authoritative environments, live cluster data, preserved topics.
const admin = await signedIn("admin", process.env.KAFKA3O_ADMIN_PASSWORD);
check("cookie-only session (no token in storage)", (await admin.page.evaluate(() => Object.keys(sessionStorage).length)) === 0);
const cards = admin.page.getByRole("article");
await admin.page.getByRole("article", { name: "Kafka B" }).waitFor({ timeout: 20_000 });
const cardText = async (name) => (await admin.page.getByRole("article", { name }).textContent()) ?? "";
check("Kafka B badge shows Production", (await cardText("Kafka B")).includes("Production"));
check("Kafka A badge shows Non-production", (await cardText("Kafka A")).includes("Non-production"));
await admin.page.waitForFunction(() => !document.body.textContent?.includes("Checking…"), null, { timeout: 30_000 }).catch(() => {});
for (const name of ["Kafka A", "Kafka B"]) {
  const text = await cardText(name);
  check(`${name} card has live cluster data`, !/unreachable|Not permitted|Authorization unavailable|Something went wrong/.test(text), text.replace(/\s+/g, " ").slice(0, 90));
}
check("two cluster cards for the ADMIN", (await cards.count()) === 2);
const topicsA = await api(admin.page, "GET", "/api/clusters/kafka-a/gateway/api/v1/topics");
check("Kafka A topics readable and pre-existing topic kept", topicsA.status === 200 && JSON.stringify(topicsA.json).includes('"tert"'));

// 2. Writes: non-Production needs no reason; Production needs ADMIN plus a reason.
const create = { name: topic, partitions: 1, replicationFactor: 1 };
for (const cluster of ["kafka-a", "kafka-b"]) {
  const existing = await api(admin.page, "GET", `/api/clusters/${cluster}/gateway/api/v1/topics`);
  if (!JSON.stringify(existing.json).includes(`"${topic}"`)) {
    if (cluster === "kafka-b") {
      const noReason = await api(admin.page, "POST", `/api/clusters/${cluster}/gateway/api/v1/topics`, create);
      check("Production topic creation without a reason is denied", noReason.status === 403, JSON.stringify(noReason.json));
    }
    const created = await api(admin.page, "POST", `/api/clusters/${cluster}/gateway/api/v1/topics`, create,
      cluster === "kafka-b" ? "P59 verification topic (synthetic)" : undefined);
    check(`ADMIN creates ${topic} on ${cluster}`, created.status >= 200 && created.status < 300, `${created.status}`);
  } else {
    check(`${topic} already exists on ${cluster}`, true);
  }
}
const adminProduce = await api(admin.page, "POST", `/api/clusters/kafka-b/gateway/api/v1/topics/${topic}/messages`,
  { value: "admin production write" }, "P59 verification message");
check("ADMIN produces on Production with a reason", adminProduce.status === 200, JSON.stringify(adminProduce.json).slice(0, 80));
const adminNoReason = await api(admin.page, "POST", `/api/clusters/kafka-b/gateway/api/v1/topics/${topic}/messages`, { value: "no reason" });
check("ADMIN Production produce without a reason is denied", adminNoReason.status === 403);

// 3. OPERATOR and role-free users.
const operator = await signedIn("operator-verify", process.env.KAFKA3O_OPERATOR_PASSWORD);
const operatorDev = await api(operator.page, "POST", `/api/clusters/kafka-a/gateway/api/v1/topics/${topic}/messages`, { value: "operator non-production write" });
check("OPERATOR produces on non-Production", operatorDev.status === 200, `${operatorDev.status}`);
const operatorProd = await api(operator.page, "POST", `/api/clusters/kafka-b/gateway/api/v1/topics/${topic}/messages`, { value: "should be denied" }, "trying");
check("OPERATOR is denied on Production even with a reason", operatorProd.status === 403 && JSON.stringify(operatorProd.json).includes("production_admin_required"),
  JSON.stringify(operatorProd.json));
const operatorAudit = await api(operator.page, "GET", "/api/audit");
check("OPERATOR cannot read audit", operatorAudit.status === 403);
const norole = await signedIn("norole-verify", process.env.KAFKA3O_NOROLE_PASSWORD);
const noroleClusters = await api(norole.page, "GET", "/api/clusters");
check("role-free user sees no clusters", noroleClusters.status === 200 && noroleClusters.json.clusters.length === 0);
const noroleRead = await api(norole.page, "GET", "/api/clusters/kafka-a/gateway/api/v1/topics");
check("role-free user cannot read a cluster", noroleRead.status === 403, `${noroleRead.status}`);

// 4. Audit: correlated intents and outcomes, reasons, scoped export.
const audit = await api(admin.page, "GET", "/api/audit?cluster=kafka-b&limit=500");
const events = audit.json?.events ?? [];
const prodIntent = events.find((e) => e.resourceKind === "gateway_request" && e.decision === "allowed" && e.reason === "P59 verification message");
const prodOutcome = prodIntent && events.find((e) => e.operationId === prodIntent.operationId && e.resourceKind === "gateway_outcome");
check("Production write audited with reason and confirmed outcome", Boolean(prodOutcome && prodOutcome.outcome === "confirmed"));
check("OPERATOR Production denial audited", events.some((e) => e.decision === "denied:production_admin_required"));
check("classification change audited", events.some((e) => e.action === "console.cluster.classify" && e.afterState === "PRODUCTION"));
const exported = await api(admin.page, "GET", "/api/audit/export?cluster=kafka-b");
check("scoped CSV export", exported.status === 200 && exported.type.startsWith("text/csv") && String(exported.json).startsWith("sequence,"));
const sessionCookie = (await admin.context.cookies()).find((c) => c.name === "__Host-kafka3o_session");
check("session cookie is HttpOnly, Secure and Strict", Boolean(sessionCookie?.httpOnly && sessionCookie.secure && sessionCookie.sameSite === "Strict"));

// 5. The old manual path no longer reaches a Gateway.
const legacy = await api(admin.page, "GET", "/manual/gateways/a/api/v1/topics");
check("old shared-token proxy path serves only the UI shell", legacy.status === 200 && legacy.type.startsWith("text/html"));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
