import { ConsoleSessionError } from "./ConsoleSessionError";

export function parseProviderUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new ConsoleSessionError("invalid_response");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConsoleSessionError("invalid_response");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new ConsoleSessionError("invalid_response");
  }
  return url.href;
}
