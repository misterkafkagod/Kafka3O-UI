import { HttpError } from "./HttpError";
import type { Problem } from "./types";

export type FetchJson = (url: string) => Promise<unknown>;

export async function fetchJson(fetchFn: typeof fetch, url: string, timeoutMs: number, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const response = await fetchFn(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    let problem: Problem | undefined;
    try {
      const body = (await response.json()) as Record<string, unknown> | null;
      problem = {
        code: typeof body?.code === "string" ? body.code : undefined,
        detail: typeof body?.detail === "string" ? body.detail : undefined,
      };
    } catch {
      problem = undefined;
    }
    throw new HttpError(response.status, `${init.method ?? "GET"} ${url} failed with ${response.status}`, problem);
  }
  return response.json();
}
