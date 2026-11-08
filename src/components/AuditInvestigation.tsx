import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AuditEvent, AuditFilters, ConsoleAuditClient } from "../console/ConsoleAudit";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { describeAdminError } from "../console/describeAdminError";
import { groupAuditTimeline } from "../console/groupAuditTimeline";
import shared from "./AccessManagement.module.css";

type AuditInvestigationProps = {
  audit: ConsoleAuditClient;
  onUnauthorized: () => void;
};

const emptyFilters: AuditFilters = { cluster: "", actor: "", action: "", outcome: "", from: "", until: "" };
const outcomes = ["", "attempted", "denied", "validation_rejected", "confirmed", "failed", "unknown", "succeeded"];

export function AuditInvestigation({ audit, onUnauthorized }: AuditInvestigationProps) {
  const [scopes, setScopes] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState<AuditFilters>(emptyFilters);
  const [applied, setApplied] = useState<AuditFilters | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    audit.scopes().then(setScopes, () => setScopes([]));
  }, [audit]);

  const run = useCallback(async (filters: AuditFilters, after?: string) => {
    setPending(true);
    setError("");
    try {
      const page = await audit.list(filters, after);
      setEvents((current) => (after ? [...current, ...page.events] : page.events));
      setNext(page.nextCursor);
      setApplied(filters);
    } catch (failure) {
      if (failure instanceof ConsoleAdminError && failure.code === "unauthorized") {
        onUnauthorized();
        return;
      }
      setError(describeAdminError(failure));
      if (!after) setEvents([]);
    } finally {
      setPending(false);
    }
  }, [audit, onUnauthorized]);

  function search(event: FormEvent) {
    event.preventDefault();
    if (!pending) void run(draft);
  }

  const field = (key: keyof AuditFilters) => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value }),
  });

  return (
    <section className={shared.section} aria-labelledby="audit-heading">
      <h2 id="audit-heading">Audit</h2>
      <p className={shared.explanation}>
        Global ADMINs can search all events; a cluster ADMIN can search only that cluster&apos;s operational events. Every search and export
        is itself audited, and no record can be changed here.
      </p>
      <form className={shared.form} onSubmit={search} aria-label="Audit filters">
        <label>Scope
          <select {...field("cluster")}>
            <option value="">All clusters and security events</option>
            {scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.name} ({scope.id})</option>)}
          </select>
        </label>
        <label>Actor ID<input {...field("actor")} /></label>
        <label>Action<input {...field("action")} placeholder="messages.produce" /></label>
        <label>Outcome
          <select {...field("outcome")}>
            {outcomes.map((outcome) => <option key={outcome} value={outcome}>{outcome || "Any"}</option>)}
          </select>
        </label>
        <label>From<input type="datetime-local" {...field("from")} /></label>
        <label>Until<input type="datetime-local" {...field("until")} /></label>
        <button type="submit" disabled={pending}>{pending ? "Searching…" : "Search audit"}</button>
        {applied && !error ? <a href={audit.exportUrl(applied)} download>Export CSV</a> : null}
      </form>
      {error ? <p role="alert" className={shared.error}>{error}</p> : null}
      {applied && !error ? (
        events.length === 0 ? <p role="status" className={shared.explanation}>No audit events match.</p> : (
          <div className={shared.tableRegion} role="region" aria-label="Audit events" tabIndex={0}>
            <table className={shared.table}>
              <thead><tr><th scope="col">Operation</th><th scope="col">Time (UTC)</th><th scope="col">Actor</th><th scope="col">Cluster</th>
                <th scope="col">Action</th><th scope="col">Decision</th><th scope="col">Outcome</th><th scope="col">Details</th></tr></thead>
              {groupAuditTimeline(events).map((group) => (
                <tbody key={group.operationId} aria-label={`Operation ${group.operationId}`}>
                  {group.events.map((event, index) => (
                    <tr key={event.sequence}>
                      {index === 0 ? <th scope="rowgroup" rowSpan={group.events.length}>{group.operationId}</th> : null}
                      <td>{event.occurredAt}</td>
                      <td>{event.actorId} ({event.source})</td>
                      <td>{event.clusterId || "—"}{event.environment ? ` · ${event.environment}` : ""}</td>
                      <td>{event.action}</td>
                      <td>{event.decision}</td>
                      <td>{event.outcome}</td>
                      <td>{[event.resourceKind && `${event.resourceKind} ${event.resourceId}`, event.reason && `reason: ${event.reason}`,
                        (event.beforeState || event.afterState) && `${event.beforeState || "none"} → ${event.afterState || "none"}`].filter(Boolean).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )
      ) : null}
      {next && applied && !error ? <button type="button" onClick={() => void run(applied, next)} disabled={pending}>Load more</button> : null}
    </section>
  );
}
