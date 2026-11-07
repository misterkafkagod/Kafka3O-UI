import type { ConsoleSession } from "./ConsoleSession";
import type { ConsoleSsoTransport } from "./ConsoleSso";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { parseConsoleSession } from "./parseConsoleSession";
import { withBrowserMarkerLock } from "./withBrowserMarkerLock";

// Posts the raw callback query from the same-origin landing page; the query is never stored or shown.
export async function completeCognitoSignIn(request: ConsoleSsoTransport, locks: LockManager | undefined, query: string): Promise<ConsoleSession> {
  const raw = query.startsWith("?") ? query.slice(1) : query;
  if (raw.length === 0 || raw.length > 8192) {
    throw new ConsoleSessionError("sign_in_failed");
  }
  return withBrowserMarkerLock(locks, async () => {
    const response = await request({ method: "POST", path: "/api/session/cognito/callback", body: { query: raw } });
    if (response.status !== 200) {
      throw new ConsoleSessionError("outcome_unknown", response.status);
    }
    try {
      return parseConsoleSession(await response.json());
    } catch {
      throw new ConsoleSessionError("outcome_unknown", response.status);
    }
  });
}
