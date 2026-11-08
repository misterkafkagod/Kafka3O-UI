import { screen, waitFor, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { resolve } from "node:path";
import process from "node:process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { consolePreviewFetch, type PreviewCookieJar } from "../test/consolePreviewFetch";
import { consolePreviewHttps } from "../test/consolePreviewHttps";
import { server } from "../test/server";

declare const jsdom: {
  reconfigure: (options: { url: string }) => void;
  cookieJar: PreviewCookieJar & { removeAllCookiesSync: () => void; cloneSync: () => PreviewCookieJar | undefined };
};

function csrfFrom(jar: PreviewCookieJar, origin: string): string {
  const prefix = "__Host-kafka3o_csrf=";
  const value = jar.getCookieStringSync(origin, { http: true }).split("; ").find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error("No CSRF cookie");
  return value;
}

describe.skipIf(process.env.KAFKA3O_PREVIEW_INTEGRATION !== "1")("built Console preview administration over verified HTTPS", () => {
  let fixture: Awaited<ReturnType<typeof consolePreviewHttps>> | undefined;
  const originalFetch = window.fetch;
  const originalConfirm = window.confirm;

  beforeAll(async () => {
    server.close();
    const gateway = process.env.KAFKA3O_GATEWAY_DIR ?? resolve(process.cwd(), "..", "Kafka3O-Gateway");
    fixture = await consolePreviewHttps(gateway, resolve(process.cwd(), "dist"), { KAFKA3O_TEST_CONSOLE_PREVIEW_CLUSTERS: "1" });
    jsdom.reconfigure({ url: `${fixture.origin}/` });
  }, 120_000);

  afterAll(async () => {
    window.fetch = originalFetch;
    window.confirm = originalConfirm;
    jsdom.cookieJar.removeAllCookiesSync();
    jsdom.reconfigure({ url: "http://localhost:3000/" });
    try {
      if (fixture) await fixture.close();
    } finally {
      server.listen({ onUnhandledFrame: "error" });
    }
  }, 20_000);

  it("manages grants and classification through the real Console with confirmation and distinct denials", async () => {
    if (!fixture) throw new Error("The Console fixture did not start");
    const { origin, ca } = fixture;
    jsdom.cookieJar.removeAllCookiesSync();
    const operatorJar = jsdom.cookieJar.cloneSync();
    if (!operatorJar) throw new Error("Could not create a second cookie jar");
    const network = consolePreviewFetch(origin, ca, jsdom.cookieJar);
    const second = consolePreviewFetch(origin, ca, operatorJar);
    const options = { credentials: "same-origin", cache: "no-store", redirect: "error" } as const;
    const page = new DOMParser().parseFromString(await (await network.fetch(`${origin}/`)).text(), "text/html");
    const scriptPath = page.querySelector<HTMLScriptElement>('script[type="module"][src^="/assets/"]')?.getAttribute("src");
    if (!scriptPath) throw new Error("The built preview has no bundle");
    const bundle = await (await network.fetch(new URL(scriptPath, origin).href)).text();
    document.body.innerHTML = '<div id="root"></div>';
    window.fetch = network.fetch;
    const confirm = vi.fn(() => false);
    window.confirm = confirm;
    window.eval(bundle);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "initial passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Access management" })).toBeNull();
    await user.type(screen.getByLabelText("Current password"), "initial passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await user.type(await screen.findByLabelText("Password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const registry = await screen.findByRole("region", { name: "Registered clusters" });
    expect(within(registry).getByRole("row", { name: /Prod \(prod\)/ }).textContent).toContain("Unclassified — writes blocked");
    const created = await network.fetch(`${origin}/api/admin/local-accounts`, {
      ...options, method: "POST",
      headers: { "Content-Type": "application/json", "X-Kafka3O-CSRF": csrfFrom(jsdom.cookieJar, origin) },
      body: JSON.stringify({ username: "alice", temporaryPassword: "alice temporary passphrase" }),
    });
    expect(created.status).toBe(201);

    // Classification: cancel sends nothing, confirm with a reason commits.
    await user.selectOptions(screen.getByLabelText("Cluster"), "prod");
    await user.type(screen.getByLabelText("Reason"), "Customer-facing cluster");
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect(confirm).toHaveBeenLastCalledWith("Classify Prod (prod) from Unclassified — writes blocked to Production? Reason: Customer-facing cluster");
    expect(network.requests.filter((item) => item.method === "PUT")).toHaveLength(0);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Registered clusters" }))
      .getByRole("row", { name: /Prod \(prod\)/ }).textContent).toContain("Production"));

    // Self-change is a distinct 403, not an outage.
    await user.selectOptions(screen.getByLabelText("Identity"), (await screen.findAllByRole("option", { name: /admin \(local\)/ }))[0]);
    await user.selectOptions(screen.getAllByLabelText("Role")[0], "VIEWER");
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect((await screen.findByRole("alert")).textContent).toContain("You cannot change your own access");

    // Reload by signing in again so the new account is listed, then grant it prod ADMIN.
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.type(await screen.findByLabelText("Password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.selectOptions(await screen.findByLabelText("Identity"), (await screen.findAllByRole("option", { name: /alice \(local\)/ }))[0]);
    await user.selectOptions(screen.getAllByLabelText("Scope")[0], "prod");
    await user.selectOptions(screen.getAllByLabelText("Role")[0], "ADMIN");
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect(confirm).toHaveBeenLastCalledWith("Change the direct grant of alice (local account) for Cluster Prod (prod) from No access to ADMIN?");
    expect(await screen.findByText(/^Saved\. Policy revision 2 /)).toBeDefined();
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Identities and direct grants" }))
      .getByRole("row", { name: /alice/ }).textContent).toContain("ADMIN — Cluster Prod (prod) (direct)"));

    // A concurrent change makes the page stale: the next save conflicts and reloads.
    const login = await second.fetch(`${origin}/api/session/local`, {
      ...options, method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "replacement passphrase" }),
    });
    expect(login.status).toBe(200);
    const listing: { identities: { id: string; label: string }[] } = await (await second.fetch(`${origin}/api/admin/access`, options)).json();
    const aliceId = listing.identities.find((entry) => entry.label === "alice")?.id;
    const concurrent = await second.fetch(`${origin}/api/admin/role-grants`, {
      ...options, method: "PUT", headers: { "Content-Type": "application/json", "X-Kafka3O-CSRF": csrfFrom(operatorJar, origin) },
      body: JSON.stringify({ identityId: aliceId, clusterId: "prod", expectedRole: "ADMIN", role: "VIEWER" }),
    });
    expect(concurrent.status).toBe(200);
    await user.selectOptions(screen.getAllByLabelText("Role")[0], "OPERATOR");
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Access changed since this page loaded");
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Identities and direct grants" }))
      .getByRole("row", { name: /alice/ }).textContent).toContain("VIEWER — Cluster Prod (prod) (direct)"));

    const writes = network.requests.filter((item) => item.method === "PUT").map(({ path, status }) => ({ path, status }));
    expect(writes).toEqual([
      { path: "/api/admin/clusters/prod/environment", status: 200 },
      { path: "/api/admin/role-grants", status: 403 },
      { path: "/api/admin/role-grants", status: 200 },
      { path: "/api/admin/role-grants", status: 409 },
    ]);
    expect(network.requests.filter((item) => item.origin !== origin || (item.path.startsWith("/api/") &&
      (item.credentials !== "same-origin" || item.cache !== "no-store" || item.redirect !== "error")))).toEqual([]);
  }, 60_000);
});
