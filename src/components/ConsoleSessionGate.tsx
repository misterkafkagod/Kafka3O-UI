import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ConsoleSession, ConsoleSessionClient } from "../console/ConsoleSession";
import { ConsoleSessionError } from "../console/ConsoleSessionError";
import styles from "./ConsoleSessionGate.module.css";

type Screen =
  | { kind: "checking" }
  | { kind: "unavailable" }
  | { kind: "signedOut"; notice?: string }
  | { kind: "signedIn"; session: ConsoleSession }
  | { kind: "uncertain"; action: "signIn" | "changePassword" | "signOut"; session?: ConsoleSession };

type ConsoleSessionGateProps = {
  client: ConsoleSessionClient;
};

export function ConsoleSessionGate({ client }: ConsoleSessionGateProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "checking" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [unresolvedChanges, setUnresolvedChanges] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmedInvestigation, setConfirmedInvestigation] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"inspect" | "signIn" | "changePassword" | "signOut" | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setScreen({ kind: "checking" });
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
    return () => controller.abort();
  }, [client]);

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
      await client.signOut();
      setScreen({
        kind: "signedOut",
        notice: uncertainPassword
          ? "Signed out. The password change outcome remains unknown; check the audit before retrying."
          : "You are signed out.",
      });
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

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Kafka3O</span>
        <span className={styles.badge}>Authentication preview</span>
      </header>
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="console-session-title" aria-busy={pending !== null || screen.kind === "checking"}>
          <p className={styles.eyebrow}>Console access</p>
          <h1 id="console-session-title">
            {screen.kind === "signedIn" && screen.session.mustChangePassword ? "Change your password"
              : screen.kind === "signedIn" ? "Signed in"
                : screen.kind === "uncertain" ? "Check your session"
                  : screen.kind === "unavailable" ? "Sign-in unavailable"
                    : screen.kind === "checking" ? "Checking your session" : "Sign in"}
          </h1>
          <p className={styles.intro}>Local accounts only. SSO and Kafka access are not available in this preview.</p>

          {screen.kind === "checking" ? <p role="status">Checking your Console session...</p> : null}
          {screen.kind === "unavailable" ? (
            <div>
              <p role="alert">The Console session could not be checked. Use verified HTTPS and check the service connection.</p>
              <button type="button" onClick={inspectAgain} disabled={pending !== null}>{pending === "inspect" ? "Checking..." : "Check again"}</button>
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
          {screen.kind === "signedIn" && !screen.session.mustChangePassword ? (
            <>
              <p role="status" className={styles.notice}>Signed in as <strong>{screen.session.username}</strong>.</p>
              {unresolvedChanges.has(screen.session.accountId) ? (
                <p role="alert" className={styles.warning}>An earlier password change may still have completed. Check the audit before retrying.</p>
              ) : null}
              <p className={styles.context}>This preview does not open clusters or enforce Kafka permissions. The existing manual interface is separate.</p>
              <button type="button" onClick={signOut} disabled={pending !== null}>{pending === "signOut" ? "Signing out..." : "Sign out"}</button>
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
