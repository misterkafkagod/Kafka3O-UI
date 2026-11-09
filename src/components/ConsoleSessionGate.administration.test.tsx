import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleAdminClient } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionGate, type SecuredAppChrome } from "./ConsoleSessionGate";

const normal: ConsoleSession = {
  accountId: "account-1", username: "admin", mustChangePassword: false, absoluteExpiresAt: "2026-11-08T12:00:00Z",
  administration: { access: true, audit: false },
};

function testClient(session: ConsoleSession | null) {
  return {
    inspect: vi.fn<ConsoleSessionClient["inspect"]>().mockResolvedValue(session),
    signIn: vi.fn<ConsoleSessionClient["signIn"]>(),
    changePassword: vi.fn<ConsoleSessionClient["changePassword"]>(),
    signOut: vi.fn<ConsoleSessionClient["signOut"]>(),
  };
}

function testAdmin() {
  return {
    listAccess: vi.fn<ConsoleAdminClient["listAccess"]>().mockResolvedValue({
      operationId: "a", policyRevision: 0, identities: [], nextCursor: "", groupGrants: [], groupGrantsTruncated: false,
    }),
    listClusters: vi.fn<ConsoleAdminClient["listClusters"]>().mockResolvedValue({ operationId: "c", policyRevision: 0, clusters: [] }),
    changeRoleGrant: vi.fn<ConsoleAdminClient["changeRoleGrant"]>(),
    changeGroupMapping: vi.fn<ConsoleAdminClient["changeGroupMapping"]>(),
    classifyCluster: vi.fn<ConsoleAdminClient["classifyCluster"]>(),
  };
}

describe("ConsoleSessionGate administration", () => {
  it("shows access management and classification only for a signed-in session without a pending password change", async () => {
    const admin = testAdmin();
    render(<ConsoleSessionGate client={testClient(normal)} admin={admin} confirm={() => false} />);
    expect(await screen.findByRole("heading", { name: "Access management" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cluster classification" })).toBeDefined();
    expect(admin.changeRoleGrant).not.toHaveBeenCalled();
  });

  it("does not load administration while signed out or restricted", async () => {
    const admin = testAdmin();
    const signedOut = render(<ConsoleSessionGate client={testClient(null)} admin={admin} confirm={() => false} />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeDefined();
    signedOut.unmount();
    render(<ConsoleSessionGate client={testClient({ ...normal, mustChangePassword: true })} admin={admin} confirm={() => false} />);
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Access management" })).toBeNull();
    expect(admin.listAccess).not.toHaveBeenCalled();
  });

  it("returns to sign-in when administration reports an ended session", async () => {
    const admin = testAdmin();
    admin.listAccess.mockRejectedValue(new ConsoleAdminError("unauthorized", 401));
    render(<ConsoleSessionGate client={testClient(normal)} admin={admin} confirm={() => false} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined());
    expect(screen.getByText("Your session has ended. Sign in again.")).toBeDefined();
  });
});

describe("ConsoleSessionGate administration reloads", () => {
  it("does not reload administration when the gate re-renders during sign-out", async () => {
    const user = userEvent.setup();
    const client = testClient(normal);
    client.signOut.mockReturnValue(new Promise(() => {}));
    const admin = testAdmin();
    render(<ConsoleSessionGate client={client} admin={admin} confirm={() => true} />);
    expect(await screen.findByRole("heading", { name: "Access management" })).toBeDefined();
    await waitFor(() => expect(admin.listAccess).toHaveBeenCalledTimes(1));
    const clusterReads = admin.listClusters.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("button", { name: "Signing out..." })).toBeDefined();
    expect(admin.listAccess).toHaveBeenCalledTimes(1);
    expect(admin.listClusters).toHaveBeenCalledTimes(clusterReads);
  });
});

describe("ConsoleSessionGate administration capabilities", () => {
  it("inspects a new session once for its capabilities and filters the sections", async () => {
    const user = userEvent.setup();
    const { administration: _flags, ...signedIn } = normal;
    const client = testClient(null);
    client.signIn.mockResolvedValue(signedIn);
    client.inspect.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...signedIn, administration: { access: false, audit: false } });
    const admin = testAdmin();
    render(<ConsoleSessionGate client={client} admin={admin} confirm={() => true} />);
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("group", { name: "Console session" })).toBeDefined();
    await waitFor(() => expect(client.inspect).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("heading", { name: "Access management" })).toBeNull();
    expect(admin.listAccess).not.toHaveBeenCalled();
  });

  it("ends the session when the capability check finds none", async () => {
    const user = userEvent.setup();
    const { administration: _flags, ...signedIn } = normal;
    const client = testClient(null);
    client.signIn.mockResolvedValue(signedIn);
    render(<ConsoleSessionGate client={client} admin={testAdmin()} confirm={() => true} />);
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Your session has ended. Sign in again.")).toBeDefined();
  });

  it("gives the secured application the link and page only for permitted sessions", async () => {
    const chromes: SecuredAppChrome[] = [];
    const renderApp = (_ended: () => void, chrome: SecuredAppChrome) => {
      chromes.push(chrome);
      return <div>{chrome.administrationPage}</div>;
    };
    const admin = testAdmin();
    const permitted = render(<ConsoleSessionGate client={testClient(normal)} admin={admin} confirm={() => true} renderApp={renderApp} />);
    expect(await screen.findByRole("heading", { name: "Access management" })).toBeDefined();
    expect(chromes.at(-1)?.administrationLink).toBe(true);
    permitted.unmount();
    render(<ConsoleSessionGate client={testClient({ ...normal, administration: { access: false, audit: false } })} admin={admin}
      confirm={() => true} renderApp={renderApp} />);
    expect(await screen.findByRole("heading", { name: "Not permitted" })).toBeDefined();
    expect(chromes.at(-1)?.administrationLink).toBe(false);
  });
});

describe("ConsoleSessionGate secured application", () => {
  it("renders the Kafka application for a signed-in session and returns to sign-in when it reports an ended session", async () => {
    let ended: (() => void) | undefined;
    const renderApp = vi.fn((sessionEnded: () => void) => {
      ended = sessionEnded;
      return <p>Kafka application</p>;
    });
    render(<ConsoleSessionGate client={testClient(normal)} renderApp={renderApp} />);
    expect(await screen.findByText("Kafka application")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Signed in" })).toBeNull();
    expect(screen.queryByText(/Kafka access follows your Console roles/)).toBeNull();
    act(() => ended?.());
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeDefined();
    expect(screen.queryByText("Kafka application")).toBeNull();
  });

  it("passes the session indicator to the application and signs out from it", async () => {
    const user = userEvent.setup();
    const client = testClient(normal);
    client.signOut.mockResolvedValue(undefined);
    render(<ConsoleSessionGate client={client} renderApp={(_ended, chrome) => <header>{chrome.sessionIndicator}</header>} />);
    const indicator = await screen.findByRole("group", { name: "Console session" });
    expect(indicator.textContent).toContain(`Signed in as ${normal.username}`);
    expect(indicator.closest("header")).not.toBeNull();
    expect(screen.queryByText("Console access")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeDefined();
  });

  it("does not render the application before the temporary password is replaced", async () => {
    const renderApp = vi.fn(() => <p>Kafka application</p>);
    render(<ConsoleSessionGate client={testClient({ ...normal, mustChangePassword: true })} renderApp={renderApp} />);
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    expect(renderApp).not.toHaveBeenCalled();
  });
});
