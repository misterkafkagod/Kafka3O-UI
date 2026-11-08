export type AuditEvent = {
  sequence: number;
  occurredAt: string;
  operationId: string;
  actorId: string;
  source: string;
  clusterId: string;
  environment: string;
  action: string;
  resourceKind: string;
  resourceId: string;
  decision: string;
  outcome: string;
  reason: string;
  beforeState: string;
  afterState: string;
};

export type AuditPage = { operationId: string; events: AuditEvent[]; nextCursor: string };

// An empty cluster is the global scope.
export type AuditFilters = { cluster: string; actor: string; action: string; outcome: string; from: string; until: string };

export type ConsoleAuditClient = {
  list: (filters: AuditFilters, after?: string) => Promise<AuditPage>;
  exportUrl: (filters: AuditFilters) => string;
  scopes: () => Promise<{ id: string; name: string }[]>;
};
