import { isRecord } from "../gateway/isRecord";
import type { ConsoleAdministration, ConsoleSession } from "./ConsoleSession";
import { ConsoleSessionError } from "./ConsoleSessionError";

export function parseConsoleSession(value: unknown): ConsoleSession {
  if (!isRecord(value) ||
      typeof value.accountId !== "string" || value.accountId.length === 0 || value.accountId.length > 128 ||
      value.accountId.trim() !== value.accountId || /[\u0000-\u001f\u007f-\u009f]/.test(value.accountId) ||
      typeof value.username !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(value.username) ||
      typeof value.mustChangePassword !== "boolean" ||
      typeof value.absoluteExpiresAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.absoluteExpiresAt)) {
    throw new ConsoleSessionError("invalid_response");
  }
  const expiry = Date.parse(value.absoluteExpiresAt);
  if (!Number.isFinite(expiry) || new Date(expiry).toISOString() !== `${value.absoluteExpiresAt.slice(0, -1)}.000Z`) {
    throw new ConsoleSessionError("invalid_response");
  }
  const flags = value.administration;
  let administration: ConsoleAdministration | undefined;
  if (flags !== undefined) {
    if (!isRecord(flags) || typeof flags.access !== "boolean" || typeof flags.audit !== "boolean") {
      throw new ConsoleSessionError("invalid_response");
    }
    administration = { access: flags.access, audit: flags.audit };
  }
  return {
    accountId: value.accountId,
    username: value.username,
    mustChangePassword: value.mustChangePassword,
    absoluteExpiresAt: value.absoluteExpiresAt,
    ...(administration ? { administration } : {}),
  };
}
