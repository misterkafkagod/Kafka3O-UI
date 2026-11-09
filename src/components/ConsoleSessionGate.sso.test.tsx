import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionError } from "../console/ConsoleSessionError";
import type { ConsoleBrowser, ConsoleSsoClient } from "../console/ConsoleSso";
import { ConsoleSessionGate } from "./ConsoleSessionGate";

const cognitoSession: ConsoleSession = {
  accountId: "account-2", username: "cognito-user", mustChangePassword: false, absoluteExpiresAt: "2026-11-07T12:00:00Z",
};

function clients(available = true) {
  const client = {
    inspect: vi.fn<ConsoleSessionClient["inspect"]>().mockResolvedValue(null),
    signIn: vi.fn<ConsoleSessionClient["signIn"]>(),
    changePassword: vi.fn<ConsoleSessionClient["changePassword"]>(),
    signOut: vi.fn<ConsoleSessionClient["signOut"]>().mockResolvedValue(undefined),
  };
  const sso = {
    available: vi.fn<ConsoleSsoClient["available"]>().mockResolvedValue(available),
    start: vi.fn<ConsoleSsoClient["start"]>().mockResolvedValue("https://login.example/oauth2/authorize?state=s"),
    complete: vi.fn<ConsoleSsoClient["complete"]>().mockResolvedValue(cognitoSession),
    signOut: vi.fn<ConsoleSsoClient["signOut"]>().mockResolvedValue("https://login.example/logout?client_id=c"),
  };
  const browser = {
    path: "/", query: "", replace: vi.fn<ConsoleBrowser["replace"]>(), assign: vi.fn<ConsoleBrowser["assign"]>(),
  };
  return { client, sso, browser };
}

describe("ConsoleSessionGate SSO", () => {
  it("offers Cognito sign-in only when available and navigates once to the provider", async () => {
    const user = userEvent.setup();
    const { client, sso, browser } = clients();
    let finish: (url: string) => void = () => {};
    sso.start.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    const button = await screen.findByRole("button", { name: "Sign in with Cognito" });
    expect(screen.getByText(/Local accounts or Cognito sign-in/)).toBeDefined();
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Opening Cognito..." }));
    await act(async () => finish("https://login.example/oauth2/authorize?state=s"));
    expect(sso.start).toHaveBeenCalledTimes(1);
    expect(browser.assign).toHaveBeenCalledExactlyOnceWith("https://login.example/oauth2/authorize?state=s");
  });

  it("hides Cognito sign-in when it is unavailable", async () => {
    const { client, sso, browser } = clients(false);
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    expect(await screen.findByRole("form", { name: "Local sign-in" })).toBeDefined();
    await waitFor(() => expect(sso.available).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Sign in with Cognito" })).toBeNull();
    expect(screen.getByText(/Local accounts only/)).toBeDefined();
  });

  it("explains start failures without leaving the local form", async () => {
    const user = userEvent.setup();
    const { client, sso, browser } = clients();
    sso.start.mockRejectedValue(new ConsoleSessionError("sso_unavailable", 503));
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    await user.click(await screen.findByRole("button", { name: "Sign in with Cognito" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Local sign-in is still available");
    expect(screen.getByRole("form", { name: "Local sign-in" })).toBeDefined();
    expect(browser.assign).not.toHaveBeenCalled();
  });

  it("strips the callback query before completing it exactly once, even in StrictMode", async () => {
    const { client, sso, browser } = clients();
    browser.path = "/auth/cognito/callback";
    browser.query = "?code=secret-code&state=secret-state";
    const order: string[] = [];
    browser.replace.mockImplementation((path: string) => { order.push(`replace ${path}`); });
    sso.complete.mockImplementation(async () => { order.push("complete"); return cognitoSession; });
    client.inspect.mockImplementation(async () => {
      order.push("inspect");
      return { ...cognitoSession, administration: { access: false, audit: false } };
    });
    render(<StrictMode><ConsoleSessionGate client={client} sso={sso} browser={browser} /></StrictMode>);
    expect(await screen.findByRole("group", { name: "Console session" })).toBeDefined();
    expect(sso.complete).toHaveBeenCalledExactlyOnceWith("?code=secret-code&state=secret-state");
    expect(order.slice(0, 2)).toEqual(["replace /auth/cognito/callback", "complete"]);
    expect(browser.replace).toHaveBeenLastCalledWith("/");
    // The only session check reads the capabilities after the callback completed.
    await waitFor(() => expect(order).toContain("inspect"));
    expect(order.indexOf("inspect")).toBeGreaterThan(order.indexOf("complete"));
    expect(client.inspect).toHaveBeenCalledOnce();
    expect(screen.getByRole("group", { name: "Console session" })).toBeDefined();
    expect(document.body.textContent).not.toContain("secret-code");
    expect(document.body.textContent).not.toContain("secret-state");
  });

  it("shows a generic notice when the callback fails", async () => {
    const { client, sso, browser } = clients();
    browser.path = "/auth/cognito/callback";
    browser.query = "?error=access_denied&state=s";
    sso.complete.mockRejectedValue(new ConsoleSessionError("sign_in_denied", 401));
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    expect(await screen.findByText("Cognito sign-in was cancelled or denied.")).toBeDefined();
    expect(browser.replace).toHaveBeenLastCalledWith("/");
    expect(screen.getByRole("form", { name: "Local sign-in" })).toBeDefined();
  });

  it("signs out locally first and then continues to the Cognito logout", async () => {
    const user = userEvent.setup();
    const { client, sso, browser } = clients();
    client.inspect.mockResolvedValue(cognitoSession);
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("status")).textContent).toContain("does not sign you out of other identity providers");
    expect(sso.signOut).toHaveBeenCalledTimes(1);
    expect(client.signOut).not.toHaveBeenCalled();
    expect(browser.assign).toHaveBeenCalledExactlyOnceWith("https://login.example/logout?client_id=c");
  });

  it("falls back to local sign-out without Web Locks and keeps uncertain sign-out explicit", async () => {
    const user = userEvent.setup();
    const { client, sso, browser } = clients(false);
    client.inspect.mockResolvedValue(cognitoSession);
    sso.signOut.mockRejectedValueOnce(new ConsoleSessionError("sso_unsupported"));
    render(<ConsoleSessionGate client={client} sso={sso} browser={browser} />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("status")).textContent).toContain("You are signed out.");
    expect(client.signOut).toHaveBeenCalledTimes(1);
    expect(browser.assign).not.toHaveBeenCalled();

    const uncertain = clients();
    uncertain.client.inspect.mockResolvedValue(cognitoSession);
    uncertain.sso.signOut.mockRejectedValue(new ConsoleSessionError("outcome_unknown"));
    render(<ConsoleSessionGate client={uncertain.client} sso={uncertain.sso} browser={uncertain.browser} />);
    await user.click((await screen.findAllByRole("button", { name: "Sign out" })).at(-1)!);
    expect((await screen.findByRole("heading", { name: "Check your session" })).textContent).toBeDefined();
    expect(uncertain.browser.assign).not.toHaveBeenCalled();
  });
});
