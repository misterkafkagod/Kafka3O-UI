export type AccessRole = "" | "VIEWER" | "OPERATOR" | "ADMIN";
export type GrantedRole = Exclude<AccessRole, "">;
export type ClusterEnvironment = "" | "NON_PRODUCTION" | "PRODUCTION";

// An empty clusterId is a global grant.
export type AccessGrant = { clusterId: string; role: GrantedRole };

export type AccessIdentity = {
  id: string;
  source: "local" | "cognito";
  label: string;
  enabled: boolean;
  grants: AccessGrant[];
};

export type GroupGrant = { issuer: string; group: string; clusterId: string; role: GrantedRole };

export type AccessListing = {
  operationId: string;
  policyRevision: number;
  identities: AccessIdentity[];
  nextCursor: string;
  groupGrants: GroupGrant[];
  groupGrantsTruncated: boolean;
};

export type RegisteredCluster = {
  id: string;
  name: string;
  gatewayUrl: string;
  environment: ClusterEnvironment;
  active: boolean;
};

export type ClusterListing = { operationId: string; policyRevision: number; clusters: RegisteredCluster[] };

export type AccessChangeResult = { operationId: string; policyRevision: number };

export type ConsoleAdminOperation =
  | { kind: "listAccess"; after?: string }
  | { kind: "changeRoleGrant"; identityId: string; clusterId: string; expectedRole: AccessRole; role: AccessRole }
  | { kind: "changeGroupMapping"; issuer: string; group: string; clusterId: string; expectedRole: AccessRole; role: AccessRole }
  | { kind: "listClusters" }
  | { kind: "classifyCluster"; clusterId: string; expectedEnvironment: ClusterEnvironment; environment: Exclude<ClusterEnvironment, "">; reason: string };

// A transport returns the parsed JSON body of a successful response or throws ConsoleAdminError.
export type ConsoleAdminTransport = (operation: ConsoleAdminOperation) => Promise<unknown>;

export type ConsoleAdminClient = {
  listAccess: (after?: string) => Promise<AccessListing>;
  changeRoleGrant: (identityId: string, clusterId: string, expectedRole: AccessRole, role: AccessRole) => Promise<AccessChangeResult>;
  changeGroupMapping: (issuer: string, group: string, clusterId: string, expectedRole: AccessRole, role: AccessRole) => Promise<AccessChangeResult>;
  listClusters: () => Promise<ClusterListing>;
  classifyCluster: (clusterId: string, expectedEnvironment: ClusterEnvironment, environment: Exclude<ClusterEnvironment, "">, reason: string) => Promise<AccessChangeResult>;
};
