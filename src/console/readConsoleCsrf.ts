import { ConsoleSessionError } from "./ConsoleSessionError";

export function readConsoleCsrf(cookies: string): string {
  const name = "__Host-kafka3o_csrf=";
  const values = cookies.split(";").map((part) => part.trim()).filter((part) => part.startsWith(name));
  if (values.length !== 1) {
    throw new ConsoleSessionError("csrf_unavailable");
  }
  const value = values[0].slice(name.length);
  if (!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value)) {
    throw new ConsoleSessionError("csrf_unavailable");
  }
  return value;
}
