import { describe, expect, it } from "vitest";
import { readConsoleCsrf } from "./readConsoleCsrf";

describe("readConsoleCsrf", () => {
  const token = "A".repeat(43);

  it("extracts only the exact host-only CSRF cookie", () => {
    expect(readConsoleCsrf(`other=value; __Host-kafka3o_csrf=${token}; suffix=value`)).toBe(token);
  });

  it("rejects missing, duplicate, malformed and noncanonical values", () => {
    for (const cookies of [
      "",
      `__Host-kafka3o_csrf_extra=${token}`,
      `__Host-kafka3o_csrf=${token}; __Host-kafka3o_csrf=${token}`,
      "__Host-kafka3o_csrf=short",
      `__Host-kafka3o_csrf=${"A".repeat(42)}B`,
      `__Host-kafka3o_csrf=${"A".repeat(42)}%41`,
    ]) {
      expect(() => readConsoleCsrf(cookies)).toThrowError(expect.objectContaining({ code: "csrf_unavailable" }));
    }
  });
});
