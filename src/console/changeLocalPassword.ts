import { isRecord } from "../gateway/isRecord";
import type { ConsoleSessionTransport } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";

export async function changeLocalPassword(request: ConsoleSessionTransport, currentPassword: string, newPassword: string): Promise<void> {
  const response = await request({ kind: "changePassword", currentPassword, newPassword });
  if (response.status !== 200) {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
  if (!isRecord(data) || data.signInRequired !== true) {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
}
