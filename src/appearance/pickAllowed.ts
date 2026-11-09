// pickAllowed returns value when it is one of the allowed strings, otherwise the fallback.
export function pickAllowed<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}
