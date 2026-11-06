import type { ConsoleSession, ConsoleSessionTransport } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { parseConsoleSession } from "./parseConsoleSession";

export async function signInLocal(request: ConsoleSessionTransport, username: string, password: string): Promise<ConsoleSession> {
  const response = await request({ kind: "login", username, password });
  if (response.status !== 200) {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
  try {
    return parseConsoleSession(await response.json());
  } catch {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
}
