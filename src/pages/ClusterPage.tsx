import { useEffect, useState } from 'react';
import { ApiError, getCluster } from '../api/client';
import type { ClusterInfo } from '../api/types';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; cluster: ClusterInfo };

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === 'cluster_unreachable') return 'Cluster unreachable';
  return e instanceof Error ? e.message : 'Something went wrong';
}

export default function ClusterPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    getCluster()
      .then((cluster) => active && setState({ kind: 'loaded', cluster }))
      .catch((e: unknown) => active && setState({ kind: 'error', message: errorMessage(e) }));
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') return <p>Loading…</p>;
  if (state.kind === 'error') return <p role="alert">{state.message}</p>;

  const { clusterId, controllerId, brokers } = state.cluster;
  return (
    <section>
      <h1>Cluster</h1>
      <p>
        Cluster id: <code>{clusterId}</code>
      </p>
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Host</th>
            <th>Port</th>
            <th>Rack</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.host}</td>
              <td>{b.port}</td>
              <td>{b.rack ?? '—'}</td>
              <td>{b.id === controllerId ? 'Controller' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
