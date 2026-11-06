import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionError } from "../console/ConsoleSessionError";
import { ConsoleSessionGate } from "./ConsoleSessionGate";

const restricted: ConsoleSession = {
  accountId: "account-1", username: "admin", mustChangePassword: true, absoluteExpiresAt: "2026-11-06T12:34:56Z",
};
const normal: ConsoleSession = { ...restricted, mustChangePassword: false };

function testClient() {
  return {
    inspect: vi.fn<ConsoleSessionClient["inspect"]>().mockResolvedValue(null),
    signIn: vi.fn<ConsoleSessionClient["signIn"]>().mockResolvedValue(restricted),
    changePassword: vi.fn<ConsoleSessionClient["changePassword"]>().mockResolvedValue(undefined),
    signOut: vi.fn<ConsoleSessionClient["signOut"]>().mockResolvedValue(undefined),
  };
}

describe("ConsoleSessionGate", () => {
  it("supports local sign-in and mandatory password replacement without replaying either request", async () => {
    const user = userEvent.setup();
    const client = testClient();
    let finishChange: () => void = () => {};
    client.changePassword.mockReturnValue(new Promise<void>((resolve) => { finishChange = resolve; }));
    render(<ConsoleSessionGate client={client} />);

    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "temporary passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(client.signIn).toHaveBeenCalledTimes(1);
    expect(client.signIn).toHaveBeenCalledWith("admin", "temporary passphrase");
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    expect(screen.getByText(/Local accounts only/).textContent).toContain("Kafka access are not available");
    expect(screen.queryByRole("link", { name: "Clusters" })).toBeNull();

    await user.type(screen.getByLabelText("Current password"), "temporary passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "different passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByRole("alert").textContent).toContain("do not match");
    expect(client.changePassword).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.submit(screen.getByRole("form", { name: "Change temporary password" }));
    expect(client.changePassword).toHaveBeenCalledTimes(1);
    expect(client.changePassword).toHaveBeenCalledWith("temporary passphrase", "replacement passphrase");
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Confirm new password") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Changing password..." }).matches(":disabled")).toBe(true);
    await act(async () => finishChange());
    expect((await screen.findByRole("status")).textContent).toContain("Sign in again");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(client.signIn).toHaveBeenCalledTimes(1);
    expect(client.changePassword).toHaveBeenCalledTimes(1);
  });

  it("shows generic credential and throttle errors and clears submitted passwords", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.signIn
      .mockRejectedValueOnce(new ConsoleSessionError("authentication_failed", 401))
      .mockRejectedValueOnce(new ConsoleSessionError("authentication_throttled", 429));
    render(<ConsoleSessionGate client={client} />);
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "private passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not accepted");
    expect(screen.getByRole("alert").textContent).not.toContain("private passphrase");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    await user.type(screen.getByLabelText("Password"), "private passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Too many");
    expect(client.signIn).toHaveBeenCalledTimes(2);
  });

  it("clears the submitted password and blocks duplicate sign-ins while a request is pending", async () => {
    const user = userEvent.setup();
    const client = testClient();
    let finishSignIn: (value: ConsoleSession) => void = () => {};
    client.signIn.mockReturnValue(new Promise<ConsoleSession>((resolve) => { finishSignIn = resolve; }));
    render(<ConsoleSessionGate client={client} />);
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "temporary passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.submit(screen.getByRole("form", { name: "Local sign-in" }));
    expect(client.signIn).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Signing in..." }).matches(":disabled")).toBe(true);
    await act(async () => finishSignIn(normal));
    expect(await screen.findByRole("heading", { name: "Signed in" })).toBeDefined();
  });

  it("requires an explicit session check after an uncertain sign-in", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.signIn.mockRejectedValueOnce(new ConsoleSessionError("outcome_unknown"));
    client.inspect.mockResolvedValueOnce(null).mockResolvedValueOnce(restricted);
    render(<ConsoleSessionGate client={client} />);
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "temporary passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be confirmed");
    expect(screen.queryByRole("form", { name: "Local sign-in" })).toBeNull();
    expect(client.inspect).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Check session" }));
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    expect(client.signIn).toHaveBeenCalledTimes(1);
    expect(client.inspect).toHaveBeenCalledTimes(2);
  });

  it("blocks sign-in when initial session inspection fails and permits a manual read retry", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockRejectedValueOnce(new ConsoleSessionError("service_unavailable", 503)).mockResolvedValueOnce(null);
    render(<ConsoleSessionGate client={client} />);
    expect(await screen.findByRole("heading", { name: "Sign-in unavailable" })).toBeDefined();
    expect(screen.queryByRole("form", { name: "Local sign-in" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("form", { name: "Local sign-in" })).toBeDefined();
    expect(client.signIn).not.toHaveBeenCalled();
  });

  it("does not mistake an active session for a completed password change", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValue(restricted);
    client.changePassword.mockRejectedValueOnce(new ConsoleSessionError("outcome_unknown"));
    render(<ConsoleSessionGate client={client} />);
    await user.type(await screen.findByLabelText("Current password"), "temporary passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect((await screen.findByRole("alert")).textContent).toContain("may have completed");
    expect(screen.queryByRole("form", { name: "Change temporary password" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Check session" }));
    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes("does not confirm"))).toBe(true);
    expect(screen.queryByRole("form", { name: "Change temporary password" })).toBeNull();
    expect(client.changePassword).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("status")).textContent).toContain("outcome remains unknown");
    expect(client.signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the password uncertainty visible after signing in again and requires explicit acknowledgement", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValue(restricted);
    client.changePassword.mockRejectedValueOnce(new ConsoleSessionError("outcome_unknown")).mockResolvedValueOnce(undefined);
    render(<ConsoleSessionGate client={client} />);
    await user.type(await screen.findByLabelText("Current password"), "temporary passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "temporary passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("checkbox", { name: "I checked the audit before retrying." })).toBeDefined();
    await user.type(screen.getByLabelText("Current password"), "temporary passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("confirm before retrying"))).toBe(true);
    expect(client.changePassword).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("checkbox", { name: "I checked the audit before retrying." }));
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect((await screen.findByRole("status")).textContent).toContain("password was changed");
    expect(client.changePassword).toHaveBeenCalledTimes(2);
  });

  it("distinguishes an incorrect current password from an expired session", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValue(restricted);
    client.changePassword
      .mockRejectedValueOnce(new ConsoleSessionError("authentication_failed", 401))
      .mockRejectedValueOnce(new ConsoleSessionError("unauthorized", 401));
    render(<ConsoleSessionGate client={client} />);
    for (let attempt = 0; attempt < 2; attempt++) {
      await user.type(await screen.findByLabelText("Current password"), "temporary passphrase");
      await user.type(screen.getByLabelText("New password"), "replacement passphrase");
      await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
      await user.click(screen.getByRole("button", { name: "Change password" }));
      if (attempt === 0) {
        expect((await screen.findByRole("alert")).textContent).toContain("current password");
        expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
      }
    }
    expect((await screen.findByRole("status")).textContent).toContain("session expired");
    expect(client.changePassword).toHaveBeenCalledTimes(2);
  });

  it("shows the authentication-only signed-in state and does not invent a successful logout", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValueOnce(normal).mockResolvedValueOnce(normal).mockResolvedValueOnce(null);
    client.signOut.mockRejectedValueOnce(new ConsoleSessionError("outcome_unknown"));
    render(<ConsoleSessionGate client={client} />);
    expect(await screen.findByRole("heading", { name: "Signed in" })).toBeDefined();
    expect(screen.getByText(/does not open clusters/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be confirmed");
    await user.click(screen.getByRole("button", { name: "Check session" }));
    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes("still active"))).toBe(true);
    expect(client.signOut).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Check session" }));
    expect(await screen.findByRole("form", { name: "Local sign-in" })).toBeDefined();
    expect(client.signOut).toHaveBeenCalledTimes(1);
  });

  it("reports a missing CSRF cookie without claiming to have signed out", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValue(normal);
    client.signOut.mockRejectedValueOnce(new ConsoleSessionError("csrf_unavailable"));
    render(<ConsoleSessionGate client={client} />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("alert")).textContent).toContain("session may still be active");
    expect(screen.getByRole("heading", { name: "Signed in" })).toBeDefined();
  });

  it("treats a confirmed expired session during logout as signed out", async () => {
    const user = userEvent.setup();
    const client = testClient();
    client.inspect.mockResolvedValue(normal);
    client.signOut.mockRejectedValueOnce(new ConsoleSessionError("unauthorized", 401));
    render(<ConsoleSessionGate client={client} />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("status")).textContent).toContain("session has ended");
    expect(screen.getByRole("form", { name: "Local sign-in" })).toBeDefined();
    expect(client.signOut).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale inspection after the client changes", async () => {
    let finish: (value: ConsoleSession) => void = () => {};
    const first = testClient();
    first.inspect.mockReturnValue(new Promise<ConsoleSession>((resolve) => { finish = resolve; }));
    const second = testClient();
    const rendered = render(<ConsoleSessionGate client={first} />);
    const firstSignal = first.inspect.mock.calls[0][0];
    rendered.rerender(<ConsoleSessionGate client={second} />);
    expect(firstSignal?.aborted).toBe(true);
    expect(await screen.findByRole("form", { name: "Local sign-in" })).toBeDefined();
    await act(async () => finish(normal));
    await waitFor(() => expect(screen.getByRole("form", { name: "Local sign-in" })).toBeDefined());
    expect(screen.queryByRole("heading", { name: "Signed in" })).toBeNull();
  });
});
