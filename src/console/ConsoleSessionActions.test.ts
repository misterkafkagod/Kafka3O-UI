import { describe, expect, it, vi } from "vitest";
import type { ConsoleSessionTransport } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { changeLocalPassword } from "./changeLocalPassword";
import { readConsoleSession } from "./readConsoleSession";
import { signInLocal } from "./signInLocal";
import { signOutConsole } from "./signOutConsole";

describe("Console session actions", () => {
  const session = {
    accountId: "account-1",
    username: "admin",
    mustChangePassword: true,
    absoluteExpiresAt: "2026-11-06T12:34:56Z",
  };

  it("inspects a validated session and treats only explicit unauthorized as signed out", async () => {
    const signal = new AbortController().signal;
    const request = vi.fn<ConsoleSessionTransport>(async () => Response.json(session));
    await expect(readConsoleSession(request, signal)).resolves.toEqual(session);
    expect(request).toHaveBeenCalledWith({ kind: "inspect" }, signal);
    request.mockRejectedValueOnce(new ConsoleSessionError("unauthorized", 401));
    await expect(readConsoleSession(request)).resolves.toBeNull();
    request.mockRejectedValueOnce(new ConsoleSessionError("service_unavailable", 503));
    await expect(readConsoleSession(request)).rejects.toMatchObject({ code: "service_unavailable" });
    request.mockResolvedValueOnce(Response.json({ ...session, username: "Invalid" }));
    await expect(readConsoleSession(request)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("signs in with a sanitized session and treats malformed success as an unknown outcome", async () => {
    const request = vi.fn<ConsoleSessionTransport>(async () => Response.json({ ...session, secret: "do-not-return" }));
    await expect(signInLocal(request, "admin", "example password")).resolves.toEqual(session);
    expect(request).toHaveBeenCalledWith({ kind: "login", username: "admin", password: "example password" });
    request.mockResolvedValueOnce(Response.json({ ...session, accountId: "" }));
    await expect(signInLocal(request, "admin", "example password")).rejects.toMatchObject({ code: "outcome_unknown" });
    request.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(signInLocal(request, "admin", "example password")).rejects.toMatchObject({ code: "outcome_unknown" });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("requires explicit sign-in-after-password-change acknowledgement", async () => {
    const request = vi.fn<ConsoleSessionTransport>(async () => Response.json({ signInRequired: true }));
    await expect(changeLocalPassword(request, "old password", "new password")).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({ kind: "changePassword", currentPassword: "old password", newPassword: "new password" });
    request.mockResolvedValueOnce(Response.json({ signInRequired: false }));
    await expect(changeLocalPassword(request, "old", "new")).rejects.toMatchObject({ code: "outcome_unknown" });
    request.mockResolvedValueOnce(new Response("not JSON"));
    await expect(changeLocalPassword(request, "old", "new")).rejects.toMatchObject({ code: "outcome_unknown" });
    request.mockRejectedValueOnce(new ConsoleSessionError("authentication_failed", 401));
    await expect(changeLocalPassword(request, "old", "new")).rejects.toMatchObject({ code: "authentication_failed" });
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("accepts only a confirmed logout and never retries an uncertain response", async () => {
    const request = vi.fn<ConsoleSessionTransport>(async () => new Response(null, { status: 204 }));
    await expect(signOutConsole(request)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({ kind: "logout" });
    request.mockResolvedValueOnce(Response.json({}));
    await expect(signOutConsole(request)).rejects.toMatchObject({ code: "outcome_unknown" });
    request.mockRejectedValueOnce(new ConsoleSessionError("unauthorized", 401));
    await expect(signOutConsole(request)).rejects.toMatchObject({ code: "unauthorized" });
    expect(request).toHaveBeenCalledTimes(3);
  });
});
