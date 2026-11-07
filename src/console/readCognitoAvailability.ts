import { isRecord } from "../gateway/isRecord";
import type { ConsoleSsoTransport } from "./ConsoleSso";

// SSO is offered only when the Console reports it available and the browser supports Web Locks.
export async function readCognitoAvailability(request: ConsoleSsoTransport, locks: LockManager | undefined): Promise<boolean> {
  if (!locks || typeof locks.request !== "function") {
    return false;
  }
  try {
    const response = await request({ method: "GET", path: "/api/session/cognito" });
    const body: unknown = await response.json();
    return response.status === 200 && isRecord(body) && body.available === true;
  } catch {
    return false;
  }
}
