import { ConsoleSessionError } from "./ConsoleSessionError";

// Every flow that can set or depend on the stable browser marker runs under one exclusive lock,
// so concurrent tabs cannot mint competing markers or interleave sign-in and sign-out responses.
export async function withBrowserMarkerLock<T>(locks: LockManager | undefined, run: () => Promise<T>): Promise<T> {
  if (!locks || typeof locks.request !== "function") {
    throw new ConsoleSessionError("sso_unsupported");
  }
  return locks.request("kafka3o-browser-marker", { mode: "exclusive" }, run) as Promise<T>;
}
