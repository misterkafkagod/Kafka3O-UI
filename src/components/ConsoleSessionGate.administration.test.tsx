import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleAdminClient } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionGate } from "./ConsoleSessionGate";

const normal: ConsoleSession = { accountId: "account-1", username: "admin", mustChangePassword: false, absoluteExpiresAt: "2026-11-08T12:00:00Z" };

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
    render(<ConsoleSessionGate client={client} renderApp={(_ended, indicator) => <header>{indicator}</header>} />);
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
