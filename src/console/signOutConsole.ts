import type { ConsoleSessionTransport } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";

export async function signOutConsole(request: ConsoleSessionTransport): Promise<void> {
  const response = await request({ kind: "logout" });
  if (response.status !== 204) {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
}
