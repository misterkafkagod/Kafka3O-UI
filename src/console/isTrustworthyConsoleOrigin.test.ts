import { describe, expect, it } from "vitest";
import { isTrustworthyConsoleOrigin } from "./isTrustworthyConsoleOrigin";

describe("isTrustworthyConsoleOrigin", () => {
  it("accepts HTTPS and exactly http://localhost", () => {
    for (const origin of ["https://console.example", "https://127.0.0.1:8443", "http://localhost:5173", "http://localhost"]) {
      expect(isTrustworthyConsoleOrigin(new URL(origin))).toBe(true);
    }
    for (const origin of ["http://console.example", "http://127.0.0.1:5173", "http://localhost.attacker.example", "http://evil-localhost", "ftp://localhost"]) {
      expect(isTrustworthyConsoleOrigin(new URL(origin))).toBe(false);
    }
  });
});
