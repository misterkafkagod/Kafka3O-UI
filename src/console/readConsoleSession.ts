import type { ConsoleSession, ConsoleSessionTransport } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { parseConsoleSession } from "./parseConsoleSession";

export async function readConsoleSession(request: ConsoleSessionTransport, signal?: AbortSignal): Promise<ConsoleSession | null> {
  let response: Response;
  try {
    response = await request({ kind: "inspect" }, signal);
  } catch (error) {
    if (error instanceof ConsoleSessionError && error.code === "unauthorized") {
      return null;
    }
    throw error;
  }
  if (response.status !== 200) {
    throw new ConsoleSessionError("invalid_response", response.status);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ConsoleSessionError("invalid_response", response.status);
  }
  return parseConsoleSession(data);
}
