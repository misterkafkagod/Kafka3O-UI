import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, Route, Routes } from 'react-router';
import { GatewayUnreachableError, getHealth } from './api/client';
import type { Health } from './api/types';
import { GatewayUnreachable, StatusBar } from './components/StatusBar';
import ClusterPage from './pages/ClusterPage';

export const HEALTH_POLL_MS = 5000;

function Layout({ health }: { health: Health | null }) {
  return (
    <>
      <header>
        <strong>Kafka3O</strong>
        <nav>
          <NavLink to="/">Home</NavLink> <NavLink to="/cluster">Cluster</NavLink>
        </nav>
        <StatusBar health={health} />
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default function App({ pollMs = HEALTH_POLL_MS }: { pollMs?: number }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [gatewayDown, setGatewayDown] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      setHealth(await getHealth());
      setGatewayDown(false);
    } catch (e) {
      if (e instanceof GatewayUnreachableError) setGatewayDown(true);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), pollMs);
    return () => clearInterval(id);
  }, [checkHealth, pollMs]);

  if (gatewayDown) return <GatewayUnreachable onRetry={() => void checkHealth()} />;

  return (
    <Routes>
      <Route element={<Layout health={health} />}>
        <Route index element={<p>Welcome to Kafka3O.</p>} />
        <Route path="cluster" element={<ClusterPage />} />
      </Route>
    </Routes>
  );
}
