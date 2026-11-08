import { isRecord } from "../gateway/isRecord";
import type { AccessGrant, AccessIdentity, AccessListing, GrantedRole, GroupGrant } from "./ConsoleAdmin";
import { ConsoleAdminError } from "./ConsoleAdminError";

const roles: ReadonlySet<unknown> = new Set<GrantedRole>(["VIEWER", "OPERATOR", "ADMIN"]);

export function parseAccessListing(value: unknown): AccessListing {
  const invalid = () => new ConsoleAdminError("invalid_response");
  if (!isRecord(value) || typeof value.operationId !== "string" || !Number.isSafeInteger(value.policyRevision) ||
      !Array.isArray(value.identities) || typeof value.nextCursor !== "string" || !Array.isArray(value.groupGrants) ||
      typeof value.groupGrantsTruncated !== "boolean") {
    throw invalid();
  }
  const identities: AccessIdentity[] = value.identities.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id === "" || (entry.source !== "local" && entry.source !== "cognito") ||
        typeof entry.label !== "string" || typeof entry.enabled !== "boolean" || !Array.isArray(entry.grants)) {
      throw invalid();
    }
    const grants: AccessGrant[] = entry.grants.map((grant: unknown) => {
      if (!isRecord(grant) || typeof grant.clusterId !== "string" || !roles.has(grant.role)) throw invalid();
      return { clusterId: grant.clusterId, role: grant.role as GrantedRole };
    });
    return { id: entry.id, source: entry.source, label: entry.label, enabled: entry.enabled, grants };
  });
  const groupGrants: GroupGrant[] = value.groupGrants.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.issuer !== "string" || typeof entry.group !== "string" ||
        typeof entry.clusterId !== "string" || !roles.has(entry.role)) {
      throw invalid();
    }
    return { issuer: entry.issuer, group: entry.group, clusterId: entry.clusterId, role: entry.role as GrantedRole };
  });
  return {
    operationId: value.operationId, policyRevision: value.policyRevision as number, identities,
    nextCursor: value.nextCursor, groupGrants, groupGrantsTruncated: value.groupGrantsTruncated,
  };
}
