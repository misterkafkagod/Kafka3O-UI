import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ConsoleAdminClient } from "../console/ConsoleAdmin";
import type { ConsoleAuditClient } from "../console/ConsoleAudit";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionError } from "../console/ConsoleSessionError";
import { cognitoCallbackPath, type ConsoleBrowser, type ConsoleSsoClient } from "../console/ConsoleSso";
import { describeSsoFailure } from "../console/describeSsoFailure";
import { AccessManagement } from "./AccessManagement";
import { AuditInvestigation } from "./AuditInvestigation";
import { ClusterClassification } from "./ClusterClassification";
import styles from "./ConsoleSessionGate.module.css";
import { SessionIndicator } from "./SessionIndicator";

type Screen =
  | { kind: "checking" }
  | { kind: "unavailable" }
  | { kind: "signedOut"; notice?: string }
  | { kind: "signedIn"; session: ConsoleSession }
  | { kind: "uncertain"; action: "signIn" | "changePassword" | "signOut"; session?: ConsoleSession };

type ConsoleSessionGateProps = {
  client: ConsoleSessionClient;
  sso?: ConsoleSsoClient;
  browser?: ConsoleBrowser;
  // Administration is shown to every signed-in session; the Console decides who may use it.
  admin?: ConsoleAdminClient;
  confirm?: (message: string) => boolean;
  // renderApp shows the secured Kafka UI for a signed-in session; it receives the session-ended callback
  // and the session indicator to place in the application header.
  renderApp?: (sessionEnded: () => void, sessionIndicator: ReactNode) => ReactNode;
  audit?: ConsoleAuditClient;
};

export function ConsoleSessionGate({ client, sso, browser, admin, confirm, renderApp, audit }: ConsoleSessionGateProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "checking" });
  const [ssoAvailable, setSsoAvailable] = useState(false);
  const callback = useRef<Promise<ConsoleSession> | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [unresolvedChanges, setUnresolvedChanges] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmedInvestigation, setConfirmedInvestigation] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"inspect" | "signIn" | "sso" | "changePassword" | "signOut" | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setScreen({ kind: "checking" });
    if (sso && browser && browser.path === cognitoCallbackPath) {
      // Strip the code and state from the address bar before completing, and complete only once.
      if (!callback.current) {
        const query = browser.query;
        browser.replace(cognitoCallbackPath);
        callback.current = sso.complete(query);
      }
      callback.current.then(
        (session) => {
          if (controller.signal.aborted) return;
          browser.replace("/");
          setScreen({ kind: "signedIn", session });
        },
        (failure: unknown) => {
          if (controller.signal.aborted) return;
          browser.replace("/");
          setScreen({ kind: "signedOut", notice: describeSsoFailure(failure) });
        },
      );
    } else {
      client.inspect(controller.signal).then(
        (session) => {
          if (!controller.signal.aborted) {
            setScreen(session ? { kind: "signedIn", session } : { kind: "signedOut" });
          }
        },
        () => {
          if (!controller.signal.aborted) setScreen({ kind: "unavailable" });
        },
      );
    }
    sso?.available().then(
      (available) => { if (!controller.signal.aborted) setSsoAvailable(available); },
      () => { if (!controller.signal.aborted) setSsoAvailable(false); },
    );
    return () => controller.abort();
  }, [client, sso, browser]);

  async function signInWithCognito() {
    if (submitting.current || !sso || !browser) return;
    submitting.current = true;
    setPending("sso");
    setError("");
    let url: string;
    try {
      url = await sso.start();
    } catch (failure) {
      const code = failure instanceof ConsoleSessionError ? failure.code : "outcome_unknown";
      if (code === "already_signed_in" || code === "outcome_unknown") {
        setScreen({ kind: "uncertain", action: "signIn" });
      } else {
        setError(describeSsoFailure(failure));
      }
      submitting.current = false;
      setPending(null);
      return;
    }
    // Leave the button pending: the window is navigating to the provider.
    browser.assign(url);
  }

  async function inspectAgain() {
    if (submitting.current) return;
    submitting.current = true;
    setPending("inspect");
    setError("");
    try {
      const session = await client.inspect();
      if (screen.kind === "uncertain" && screen.action === "changePassword") {
        if (session) {
          setScreen({ ...screen, session });
          setError("An active session does not confirm whether the password change finished. Sign out and check the audit before retrying.");
        } else {
          setScreen({ kind: "signedOut", notice: "Your session ended, but the password change outcome is still unknown. Check the audit before retrying." });
        }
      } else if (screen.kind === "uncertain" && screen.action === "signOut" && session) {
        setScreen({ ...screen, session });
        setError("Your session is still active. Sign-out was not confirmed.");
      } else if (session) {
        setScreen({ kind: "signedIn", session });
      } else {
        setScreen({
          kind: "signedOut",
          notice: screen.kind === "uncertain" ? "No active browser session was found. No request was retried." : undefined,
        });
      }
    } catch {
      if (screen.kind === "uncertain") {
        setError("The session could not be checked. The previous request may still have completed.");
      } else {
        setScreen({ kind: "unavailable" });
      }
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending("signIn");
    setError("");
    const submittedPassword = password;
    setPassword("");
    try {
      const session = await client.signIn(username, submittedPassword);
      setConfirmedInvestigation(false);
      setScreen({ kind: "signedIn", session });
    } catch (failure) {
      const code = failure instanceof ConsoleSessionError ? failure.code : "outcome_unknown";
      if (code === "authentication_failed") {
        setError("The username or password was not accepted, or the account is unavailable.");
      } else if (code === "authentication_throttled") {
        setError("Too many sign-in attempts. Wait before trying again.");
      } else if (code === "insecure_origin") {
        setError("Sign-in requires a verified HTTPS connection to the Console.");
      } else if (code === "already_signed_in" || code === "outcome_unknown") {
        setScreen({ kind: "uncertain", action: "signIn" });
      } else {
        setError("Sign-in could not be completed. Check the Console connection and try again.");
      }
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || screen.kind !== "signedIn") return;
    if (unresolvedChanges.has(screen.session.accountId) && !confirmedInvestigation) {
      setError("Check the audit and confirm before retrying the password change.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    submitting.current = true;
    setPending("changePassword");
    setError("");
    const submittedCurrent = currentPassword;
    const submittedNew = newPassword;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    try {
      await client.changePassword(submittedCurrent, submittedNew);
      setUnresolvedChanges((current) => {
        const remaining = new Set(current);
        remaining.delete(screen.session.accountId);
        return remaining;
      });
      setConfirmedInvestigation(false);
      setScreen({ kind: "signedOut", notice: "Your password was changed. Sign in again with the new password." });
    } catch (failure) {
      const code = failure instanceof ConsoleSessionError ? failure.code : "outcome_unknown";
      if (code === "unauthorized") {
        setScreen({ kind: "signedOut", notice: "Your session expired. Sign in again; the password change was not confirmed." });
      } else if (code === "authentication_failed") {
        setError("The current password was not accepted.");
      } else if (code === "invalid_password") {
        setError("Choose a different password that meets the password requirements.");
      } else if (code === "authentication_throttled") {
        setError("Too many attempts. Wait before trying again.");
      } else if (code === "csrf_unavailable" || code === "csrf_rejected") {
        setError("The request could not be verified. Check your session before trying again.");
      } else if (code === "insecure_origin" || code === "invalid_configuration") {
        setError("The password change could not be sent. Check the verified HTTPS Console connection.");
      } else if (code === "invalid_request" || code === "request_rejected") {
        setError("The password change was rejected. Check the request and try again.");
      } else {
        setUnresolvedChanges((current) => new Set(current).add(screen.session.accountId));
        setConfirmedInvestigation(false);
        setScreen({ kind: "uncertain", action: "changePassword", session: screen.session });
      }
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function signOut() {
    if (submitting.current) return;
    submitting.current = true;
    setPending("signOut");
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setConfirmedInvestigation(false);
    const uncertainPassword = screen.kind === "uncertain" && screen.action === "changePassword";
    try {
      let providerLogoutUrl: string | null = null;
      try {
        providerLogoutUrl = sso ? await sso.signOut() : (await client.signOut(), null);
      } catch (failure) {
        if (!(failure instanceof ConsoleSessionError && failure.code === "sso_unsupported")) throw failure;
        await client.signOut();
      }
      setScreen({
        kind: "signedOut",
        notice: uncertainPassword
          ? "Signed out. The password change outcome remains unknown; check the audit before retrying."
          : providerLogoutUrl
            ? "You are signed out of Kafka3O. Continuing to Cognito sign-out; this does not sign you out of other identity providers."
            : "You are signed out.",
      });
      if (providerLogoutUrl && browser) browser.assign(providerLogoutUrl);
    } catch (failure) {
      const code = failure instanceof ConsoleSessionError ? failure.code : "outcome_unknown";
      if (code === "unauthorized") {
        setScreen({
          kind: "signedOut",
          notice: uncertainPassword
            ? "Your session ended. The password change outcome remains unknown; check the audit before retrying."
            : "Your session has ended.",
        });
      } else if (code === "csrf_unavailable" || code === "csrf_rejected") {
        setError("Sign-out could not be verified. Your session may still be active.");
      } else {
        const session = screen.kind === "signedIn" || screen.kind === "uncertain" ? screen.session : undefined;
        setScreen({ kind: "uncertain", action: uncertainPassword ? "changePassword" : "signOut", session });
      }
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  function sessionEnded() {
    setScreen({ kind: "signedOut", notice: "Your session has ended. Sign in again." });
  }

  const activeSession = screen.kind === "signedIn" && !screen.session.mustChangePassword ? screen.session : undefined;
  const administration = admin && confirm && activeSession ? (
    <div className={styles.administration} key={activeSession.accountId}>
      <AccessManagement admin={admin} confirm={confirm} onUnauthorized={sessionEnded} />
      <ClusterClassification admin={admin} confirm={confirm} onUnauthorized={sessionEnded} />
      {audit ? <AuditInvestigation audit={audit} onUnauthorized={sessionEnded} /> : null}
    </div>
  ) : null;
  if (activeSession) {
    const indicator = <SessionIndicator username={activeSession.username} signingOut={pending === "signOut"} onSignOut={signOut} />;
    const alerts = (
      <>
        {unresolvedChanges.has(activeSession.accountId) ? (
          <p role="alert" className={styles.warning}>An earlier password change may still have completed. Check the audit before retrying.</p>
        ) : null}
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      </>
    );
    if (renderApp) {
      return (
        <div className={styles.signedIn}>
          <div className={styles.alerts}>{alerts}</div>
          <div key={`app-${activeSession.accountId}`}>{renderApp(sessionEnded, indicator)}</div>
          {administration ? <div className={styles.main}>{administration}</div> : null}
        </div>
      );
    }
    return (
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.brand}>Kafka3O</span>
          <span className={styles.badge}>Authentication preview</span>
          {indicator}
        </header>
        <main className={styles.main}>
          <div className={styles.alerts}>
            <p className={styles.notice}>This preview does not open clusters or enforce Kafka permissions. The existing manual interface is separate.</p>
            {alerts}
          </div>
          {administration}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Kafka3O</span>
        <span className={styles.badge}>{renderApp ? "Secured" : "Authentication preview"}</span>
      </header>
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="console-session-title" aria-busy={pending !== null || screen.kind === "checking"}>
          <p className={styles.eyebrow}>Console access</p>
          <h1 id="console-session-title">
            {screen.kind === "signedIn" ? "Change your password"
                : screen.kind === "uncertain" ? "Check your session"
                  : screen.kind === "unavailable" ? "Sign-in unavailable"
                    : screen.kind === "checking" ? "Checking your session" : "Sign in"}
          </h1>
          <p className={styles.intro}>
            {renderApp
              ? (ssoAvailable ? "Local accounts or Cognito sign-in. Kafka access follows your Console roles." : "Local accounts only. Kafka access follows your Console roles.")
              : ssoAvailable
                ? "Local accounts or Cognito sign-in. Kafka access is not available in this preview."
                : "Local accounts only. SSO and Kafka access are not available in this preview."}
          </p>

          {screen.kind === "checking" ? <p role="status">Checking your Console session...</p> : null}
          {screen.kind === "unavailable" ? (
            <div>
              <p role="alert">The Console session could not be checked. Use verified HTTPS and check the service connection.</p>
              <div className={styles.actions}>
                <button type="button" onClick={inspectAgain} disabled={pending !== null}>{pending === "inspect" ? "Checking..." : "Check again"}</button>
                <button type="button" className={styles.secondary} onClick={signOut} disabled={pending !== null}>{pending === "signOut" ? "Signing out..." : "Sign out"}</button>
              </div>
            </div>
          ) : null}
          {screen.kind === "signedOut" ? (
            <>
              {screen.notice ? <p role="status" className={styles.notice}>{screen.notice}</p> : null}
              <form aria-label="Local sign-in" onSubmit={signIn}>
                <fieldset disabled={pending !== null}>
                  <label>
                    Username
                    <input autoComplete="username" spellCheck={false} maxLength={64} required value={username}
                      onChange={(event) => setUsername(event.target.value)} />
                  </label>
                  <label>
                    Password
                    <input type="password" autoComplete="current-password" required value={password}
                      onChange={(event) => setPassword(event.target.value)} />
                  </label>
                  <button type="submit">{pending === "signIn" ? "Signing in..." : "Sign in"}</button>
                </fieldset>
              </form>
              {ssoAvailable ? (
                <button type="button" className={styles.secondary} onClick={signInWithCognito} disabled={pending !== null}>
                  {pending === "sso" ? "Opening Cognito..." : "Sign in with Cognito"}
                </button>
              ) : null}
            </>
          ) : null}
          {screen.kind === "signedIn" && screen.session.mustChangePassword ? (
            <>
              <p className={styles.context}>Signed in as <strong>{screen.session.username}</strong>. Replace the temporary password to continue.</p>
              {unresolvedChanges.has(screen.session.accountId) ? (
                <div className={styles.warning}>
                  <p role="alert">An earlier password change may still have completed. Check the audit before trying again.</p>
                  <label className={styles.checkbox}>
                    <input type="checkbox" checked={confirmedInvestigation} disabled={pending !== null}
                      onChange={(event) => setConfirmedInvestigation(event.target.checked)} />
                    I checked the audit before retrying.
                  </label>
                </div>
              ) : null}
              <p id="console-password-help" className={styles.help}>Use at least 12 characters, no more than 1024 UTF-8 bytes, and a password that is not all whitespace.</p>
              <form aria-label="Change temporary password" onSubmit={changePassword}>
                <fieldset disabled={pending !== null}>
                  <label>
                    Current password
                    <input type="password" autoComplete="current-password" required value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)} />
                  </label>
                  <label>
                    New password
                    <input type="password" autoComplete="new-password" aria-describedby="console-password-help" required value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)} />
                  </label>
                  <label>
                    Confirm new password
                    <input type="password" autoComplete="new-password" required value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)} />
                  </label>
                  <button type="submit">{pending === "changePassword" ? "Changing password..." : "Change password"}</button>
                </fieldset>
              </form>
              <button type="button" className={styles.secondary} onClick={signOut} disabled={pending !== null}>{pending === "signOut" ? "Signing out..." : "Sign out"}</button>
            </>
          ) : null}
          {screen.kind === "uncertain" ? (
            <>
              <p role="alert" className={styles.warning}>
                {screen.action === "changePassword"
                  ? "The password change may have completed. Do not retry it automatically; check the audit and sign in again."
                  : screen.action === "signOut"
                    ? "Sign-out could not be confirmed. Your session may still be active."
                    : "Sign-in could not be confirmed. Check your session before attempting to sign in again."}
              </p>
              <div className={styles.actions}>
                <button type="button" onClick={inspectAgain} disabled={pending !== null}>{pending === "inspect" ? "Checking..." : "Check session"}</button>
                {screen.action !== "signIn" ? (
                  <button type="button" className={styles.secondary} onClick={signOut} disabled={pending !== null}>{pending === "signOut" ? "Signing out..." : "Sign out"}</button>
                ) : null}
              </div>
            </>
          ) : null}
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
