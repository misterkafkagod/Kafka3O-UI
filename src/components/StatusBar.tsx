import type { Health } from '../api/types';

interface StatusBarProps {
  /** Latest health answer; null until the first check returns. */
  health: Health | null;
}

/** Shows gateway and cluster state separately. */
export function StatusBar({ health }: StatusBarProps) {
  if (!health) return <div role="status">Checking gateway…</div>;

  const { reachable, error } = health.cluster;
  return (
    <div role="status">
      <span>Gateway: up</span>
      {' · '}
      <span>Cluster: {reachable ? 'reachable' : 'unreachable'}</span>
      {!reachable && error && <span title={error}> ({error})</span>}
    </div>
  );
}

interface GatewayUnreachableProps {
  onRetry: () => void;
}

/** Full-page replacement shown while the gateway cannot be reached. */
export function GatewayUnreachable({ onRetry }: GatewayUnreachableProps) {
  return (
    <main role="alert">
      <h1>Gateway unreachable</h1>
      <p>The Kafka3O gateway is not responding. Check that it is running.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </main>
  );
}
