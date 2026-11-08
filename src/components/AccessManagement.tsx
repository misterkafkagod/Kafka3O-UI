import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AccessListing, AccessRole, ConsoleAdminClient, RegisteredCluster } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { describeAccessScope } from "../console/describeAccessScope";
import { describeAdminError } from "../console/describeAdminError";
import styles from "./AccessManagement.module.css";

type AccessManagementProps = {
  admin: ConsoleAdminClient;
  confirm: (message: string) => boolean;
  onUnauthorized: () => void;
};

const roleLabels: Record<AccessRole, string> = { "": "No access", VIEWER: "VIEWER", OPERATOR: "OPERATOR", ADMIN: "ADMIN" };
const roleOptions: AccessRole[] = ["", "VIEWER", "OPERATOR", "ADMIN"];

export function AccessManagement({ admin, confirm, onUnauthorized }: AccessManagementProps) {
  const [listing, setListing] = useState<AccessListing | null>(null);
  const [clusters, setClusters] = useState<RegisteredCluster[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [identityId, setIdentityId] = useState("");
  const [grantScope, setGrantScope] = useState("");
  const [grantRole, setGrantRole] = useState<AccessRole>("VIEWER");
  const [issuer, setIssuer] = useState("");
  const [group, setGroup] = useState("");
  const [mappingScope, setMappingScope] = useState("");
  const [mappingRole, setMappingRole] = useState<AccessRole>("VIEWER");

  const fail = useCallback((failure: unknown) => {
    if (failure instanceof ConsoleAdminError && failure.code === "unauthorized") {
      onUnauthorized();
      return;
    }
    setError(describeAdminError(failure));
  }, [onUnauthorized]);

  const load = useCallback(async () => {
    try {
      const [access, registry] = await Promise.all([admin.listAccess(), admin.listClusters()]);
      setListing(access);
      setClusters(registry.clusters);
    } catch (failure) {
      fail(failure);
    }
  }, [admin, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (!listing?.nextCursor || pending) return;
    setPending(true);
    try {
      const next = await admin.listAccess(listing.nextCursor);
      setListing({ ...next, identities: [...listing.identities, ...next.identities] });
    } catch (failure) {
      fail(failure);
    } finally {
      setPending(false);
    }
  }

  const identity = listing?.identities.find((entry) => entry.id === identityId);
  const currentGrant: AccessRole = identity?.grants.find((grant) => grant.clusterId === grantScope)?.role ?? "";
  const currentMapping: AccessRole = listing?.groupGrants.find((mapping) =>
    mapping.issuer === issuer && mapping.group === group && mapping.clusterId === mappingScope)?.role ?? "";
  const activeClusters = clusters.filter((cluster) => cluster.active);

  async function submitChange(message: string, send: () => Promise<{ operationId: string; policyRevision: number }>) {
    setError("");
    setNotice("");
    if (!confirm(message)) {
      setNotice("Canceled. No change was sent.");
      return;
    }
    setPending(true);
    try {
      const result = await send();
      setNotice(`Saved. Policy revision ${result.policyRevision} (operation ${result.operationId}).`);
      await load();
    } catch (failure) {
      fail(failure);
      if (failure instanceof ConsoleAdminError && failure.code === "policy_conflict") await load();
    } finally {
      setPending(false);
    }
  }

  function changeGrant(event: FormEvent) {
    event.preventDefault();
    if (pending || !identity) return;
    if (grantRole === currentGrant) {
      setError("Choose a role different from the current one.");
      return;
    }
    const subject = `${identity.label} (${identity.source === "local" ? "local account" : "Cognito identity"})`;
    void submitChange(
      `Change the direct grant of ${subject} for ${describeAccessScope(grantScope, clusters)} from ${roleLabels[currentGrant]} to ${roleLabels[grantRole]}?`,
      () => admin.changeRoleGrant(identity.id, grantScope, currentGrant, grantRole),
    );
  }

  function changeMapping(event: FormEvent) {
    event.preventDefault();
    if (pending || issuer === "" || group === "") return;
    if (mappingRole === currentMapping) {
      setError("Choose a role different from the current one.");
      return;
    }
    void submitChange(
      `Change Cognito group "${group}" from ${issuer} for ${describeAccessScope(mappingScope, clusters)} from ${roleLabels[currentMapping]} to ${roleLabels[mappingRole]}?`,
      () => admin.changeGroupMapping(issuer, group, mappingScope, currentMapping, mappingRole),
    );
  }

  return (
    <section className={styles.section} aria-labelledby="access-management-heading">
      <h2 id="access-management-heading">Access management</h2>
      <p className={styles.explanation}>
        Access is additive: a user&apos;s effective role on a cluster is the highest of their global grant, that cluster&apos;s grant and
        any mapped Cognito group grants. A cluster VIEWER grant does not limit an existing global OPERATOR or ADMIN grant. Group
        changes apply on the user&apos;s next verified Cognito token, within five minutes.
      </p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
      {listing === null ? (error ? null : <p role="status">Loading access…</p>) : (
        <>
          <h3>Identities and direct grants</h3>
          <div className={styles.tableRegion} role="region" aria-label="Identities and direct grants" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Identity</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Grants</th></tr></thead>
              <tbody>
                {listing.identities.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row">{entry.label || entry.id}</th>
                    <td>{entry.source === "local" ? "Local account" : "Cognito identity"}</td>
                    <td>{entry.enabled ? "Enabled" : "Disabled"}</td>
                    <td>
                      {entry.grants.length === 0 ? "No access" : (
                        <ul className={styles.grants}>
                          {entry.grants.map((grant) => (
                            <li key={grant.clusterId}>{grant.role} — {describeAccessScope(grant.clusterId, clusters)} (direct)</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listing.nextCursor ? <button type="button" onClick={() => void loadMore()} disabled={pending}>Load more identities</button> : null}
          <h3>Cognito group mappings</h3>
          {listing.groupGrants.length === 0 ? <p className={styles.explanation}>No Cognito groups are mapped.</p> : (
            <div className={styles.tableRegion} role="region" aria-label="Cognito group mappings" tabIndex={0}>
              <table className={styles.table}>
                <thead><tr><th scope="col">Group</th><th scope="col">Issuer</th><th scope="col">Scope</th><th scope="col">Role</th></tr></thead>
                <tbody>
                  {listing.groupGrants.map((mapping) => (
                    <tr key={`${mapping.issuer}#${mapping.group}#${mapping.clusterId}`}>
                      <th scope="row">{mapping.group}</th>
                      <td>{mapping.issuer}</td>
                      <td>{describeAccessScope(mapping.clusterId, clusters)} (Cognito group)</td>
                      <td>{mapping.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {listing.groupGrantsTruncated ? <p role="alert" className={styles.error}>Only the first 1000 group mappings are shown.</p> : null}
          <form className={styles.form} onSubmit={changeGrant} aria-labelledby="grant-form-heading">
            <h3 id="grant-form-heading">Change a direct grant</h3>
            <label>Identity
              <select value={identityId} onChange={(event) => setIdentityId(event.target.value)} required>
                <option value="">Choose an identity</option>
                {listing.identities.map((entry) => <option key={entry.id} value={entry.id}>{entry.label || entry.id} ({entry.source})</option>)}
              </select>
            </label>
            <label>Scope
              <select value={grantScope} onChange={(event) => setGrantScope(event.target.value)}>
                <option value="">All clusters</option>
                {activeClusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{describeAccessScope(cluster.id, clusters)}</option>)}
              </select>
            </label>
            <label>Role
              <select value={grantRole} onChange={(event) => setGrantRole(event.target.value as AccessRole)}>
                {roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </label>
            {identity ? <p className={styles.current}>Current direct role for this scope: {roleLabels[currentGrant]}</p> : null}
            <button type="submit" disabled={pending || !identity}>Review grant change</button>
          </form>
          <form className={styles.form} onSubmit={changeMapping} aria-labelledby="mapping-form-heading">
            <h3 id="mapping-form-heading">Map a Cognito group</h3>
            <label>Issuer
              <input type="url" value={issuer} onChange={(event) => setIssuer(event.target.value.trim())} placeholder="https://cognito-idp.region.amazonaws.com/pool-id" required />
            </label>
            <label>Group (case-sensitive)
              <input value={group} onChange={(event) => setGroup(event.target.value)} required />
            </label>
            <label>Scope
              <select value={mappingScope} onChange={(event) => setMappingScope(event.target.value)}>
                <option value="">All clusters</option>
                {activeClusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{describeAccessScope(cluster.id, clusters)}</option>)}
              </select>
            </label>
            <label>Role
              <select value={mappingRole} onChange={(event) => setMappingRole(event.target.value as AccessRole)}>
                {roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </label>
            {issuer && group ? <p className={styles.current}>Current mapped role for this scope: {roleLabels[currentMapping]}</p> : null}
            <button type="submit" disabled={pending || issuer === "" || group === ""}>Review mapping change</button>
          </form>
        </>
      )}
    </section>
  );
}
