import { isRecord } from "../gateway/isRecord";
import type { ConsoleSsoTransport } from "./ConsoleSso";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { parseProviderUrl } from "./parseProviderUrl";
import { withBrowserMarkerLock } from "./withBrowserMarkerLock";

// Revokes the Console session first; a Cognito session returns the provider logout URL to visit next.
export async function signOutConsoleSso(request: ConsoleSsoTransport, locks: LockManager | undefined): Promise<string | null> {
  return withBrowserMarkerLock(locks, async () => {
    const response = await request({ method: "POST", path: "/api/session/logout", csrf: true });
    if (response.status === 204) {
      return null;
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ConsoleSessionError("outcome_unknown", response.status);
    }
    if (response.status !== 200 || !isRecord(body)) {
      throw new ConsoleSessionError("outcome_unknown", response.status);
    }
    return parseProviderUrl(body.providerLogoutUrl);
  });
}
