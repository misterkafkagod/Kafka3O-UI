import styles from "./SessionIndicator.module.css";

type SessionIndicatorProps = {
  username: string;
  signingOut: boolean;
  onSignOut: () => void;
};

export function SessionIndicator({ username, signingOut, onSignOut }: SessionIndicatorProps) {
  return (
    <div role="group" aria-label="Console session" className={styles.indicator}>
      <span className={styles.user}>Signed in as <strong>{username}</strong></span>
      <button type="button" className={styles.signOut} onClick={onSignOut} disabled={signingOut}>
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
