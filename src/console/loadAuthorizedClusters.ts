import type { GatewayEntry } from "../gateway/types";
import { HttpError } from "../gateway/HttpError";
import { isRecord } from "../gateway/isRecord";

// loadAuthorizedClusters lists the clusters the Console session may read; each "gateway" URL is the Console's
// same-origin forwarding base for that cluster, never a Gateway address.
export async function loadAuthorizedClusters(fetchFn: typeof fetch, origin: string, onUnauthorized: () => void): Promise<GatewayEntry[]> {
  const response = await fetchFn(`${origin}/api/clusters`, {
    headers: { Accept: "application/json" }, credentials: "same-origin", mode: "same-origin",
    redirect: "error", cache: "no-store", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) {
    onUnauthorized();
  }
  if (!response.ok) {
    throw new HttpError(response.status, `GET /api/clusters failed with ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.clusters)) {
    throw new Error("The Console returned an invalid cluster list.");
  }
  return body.clusters.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(entry.id) || entry.id === "." || entry.id === ".." || typeof entry.name !== "string" ||
        (entry.environment !== "" && entry.environment !== "NON_PRODUCTION" && entry.environment !== "PRODUCTION")) {
      throw new Error("The Console returned an invalid cluster list.");
    }
    return { id: entry.id, name: entry.name, url: `${origin}/api/clusters/${entry.id}/gateway`, environment: entry.environment };
  });
}
