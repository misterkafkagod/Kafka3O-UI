import type { ConsoleAdminClient } from "../console/ConsoleAdmin";
import type { ConsoleAuditClient } from "../console/ConsoleAudit";
import type { ConsoleAdministration } from "../console/ConsoleSession";
import { AccessManagement } from "./AccessManagement";
import styles from "./AdministrationPage.module.css";
import { AuditInvestigation } from "./AuditInvestigation";
import { ClusterClassification } from "./ClusterClassification";

type AdministrationPageProps = {
  // undefined while the session check has not reported the session's capabilities yet.
  administration: ConsoleAdministration | undefined;
  admin?: ConsoleAdminClient;
  audit?: ConsoleAuditClient;
  confirm?: (message: string) => boolean;
  onUnauthorized: () => void;
};

export function AdministrationPage({ administration, admin, audit, confirm, onUnauthorized }: AdministrationPageProps) {
  if (administration === undefined) {
    return <main className={styles.page}><p role="status">Checking access...</p></main>;
  }
  const access = administration.access && admin && confirm ? { admin, confirm } : undefined;
  const auditClient = administration.audit ? audit : undefined;
  if (!access && !auditClient) {
    return (
      <main className={styles.page}>
        <h2>Not permitted</h2>
        <p>Administration requires an ADMIN role. Ask a global administrator if you need access.</p>
      </main>
    );
  }
  return (
    <main className={styles.page} aria-labelledby="administration-heading">
      <h2 id="administration-heading">Administration</h2>
      {access ? (
        <>
          <AccessManagement admin={access.admin} confirm={access.confirm} onUnauthorized={onUnauthorized} />
          <ClusterClassification admin={access.admin} confirm={access.confirm} onUnauthorized={onUnauthorized} />
        </>
      ) : null}
      {auditClient ? <AuditInvestigation audit={auditClient} onUnauthorized={onUnauthorized} /> : null}
    </main>
  );
}
