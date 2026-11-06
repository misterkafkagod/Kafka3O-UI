import { describe, expect, it } from "vitest";
import { parseConsoleSession } from "./parseConsoleSession";

describe("parseConsoleSession", () => {
  const session = {
    accountId: "account-1",
    username: "admin",
    mustChangePassword: false,
    absoluteExpiresAt: "2026-11-06T12:34:56Z",
  };

  it("returns only the expected session fields", () => {
    expect(parseConsoleSession({ ...session, passwordHash: "must-not-escape" })).toEqual(session);
  });

  it("accepts the additive authentication source without changing the preview contract", () => {
    expect(parseConsoleSession({ ...session, authSource: "local" })).toEqual(session);
    expect(parseConsoleSession({ ...session, username: "cognito-user", authSource: "cognito" })).toEqual({
      ...session,
      username: "cognito-user",
    });
  });

  it("rejects malformed or unnormalized server results", () => {
    for (const value of [
      null, [], {}, { ...session, accountId: "" }, { ...session, accountId: " id" },
      { ...session, accountId: "id\u0000" }, { ...session, username: "Admin" },
      { ...session, username: "bad name" }, { ...session, mustChangePassword: "false" },
      { ...session, absoluteExpiresAt: "tomorrow" },
      { ...session, absoluteExpiresAt: "2026-02-31T12:34:56Z" },
      { ...session, absoluteExpiresAt: "2026-11-06T12:34:56+00:00" },
    ]) {
      expect(() => parseConsoleSession(value)).toThrowError(expect.objectContaining({ code: "invalid_response" }));
    }
  });
});
