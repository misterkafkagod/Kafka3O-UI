import { isRecord } from "./isRecord";

export function requireAcceptedAdministration(response: unknown, key: "name" | "topic", expected: string): void {
  if (!isRecord(response) || response.status !== "accepted" || response[key] !== expected) {
    throw new Error("The gateway did not confirm the requested change.");
  }
}
