import { HttpError } from "./HttpError";

export type FetchJson = (url: string) => Promise<unknown>;

export async function fetchJson(fetchFn: typeof fetch, url: string, timeoutMs: number): Promise<unknown> {
  const response = await fetchFn(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new HttpError(response.status, `GET ${url} failed with ${response.status}`);
  }
  return response.json();
}
