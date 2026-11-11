// formatAge says how long before `now` the moment `then` was, in the largest whole unit (seconds to days).
export function formatAge(then: string, now: string): string {
  const seconds = Math.max(0, Math.floor((new Date(now).getTime() - new Date(then).getTime()) / 1000));
  const units: [number, string][] = [[86400, "day"], [3600, "hour"], [60, "minute"], [1, "second"]];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${name}${count === 1 ? "" : "s"}`;
    }
  }
  return "0 seconds";
}
