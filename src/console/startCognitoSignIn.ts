import { isRecord } from "../gateway/isRecord";
import type { ConsoleSsoTransport } from "./ConsoleSso";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { parseProviderUrl } from "./parseProviderUrl";
import { withBrowserMarkerLock } from "./withBrowserMarkerLock";

// Ensures the stable marker and starts a marker-bound attempt; the caller navigates to the result.
export async function startCognitoSignIn(request: ConsoleSsoTransport, locks: LockManager | undefined): Promise<string> {
  return withBrowserMarkerLock(locks, async () => {
    const ensured = await request({ method: "POST", path: "/api/session/browser" });
    if (ensured.status !== 204) {
      throw new ConsoleSessionError("outcome_unknown", ensured.status);
    }
    const started = await request({ method: "POST", path: "/api/session/cognito/start" });
    let body: unknown;
    try {
      body = await started.json();
    } catch {
      throw new ConsoleSessionError("invalid_response", started.status);
    }
    if (started.status !== 200 || !isRecord(body)) {
      throw new ConsoleSessionError("invalid_response", started.status);
    }
    return parseProviderUrl(body.authorizationUrl);
  });
}
