import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';
import { server } from './test/server';

const healthy = () => HttpResponse.json({ gateway: 'up', cluster: { reachable: true } });

function renderApp(pollMs?: number) {
  return render(
    <MemoryRouter>
      <App pollMs={pollMs} />
    </MemoryRouter>,
  );
}

describe('App health', () => {
  it('shows gateway up and cluster reachable', async () => {
    server.use(http.get('/api/health', healthy));
    renderApp();
    expect(await screen.findByText('Cluster: reachable')).toBeTruthy();
  });

  it('picks up a cluster outage on the next poll', async () => {
    server.use(http.get('/api/health', healthy));
    renderApp(50);
    await screen.findByText('Cluster: reachable');

    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({ gateway: 'up', cluster: { reachable: false, error: 'connection refused' } }),
      ),
    );
    expect(await screen.findByText('Cluster: unreachable')).toBeTruthy();
    expect(screen.getByText('(connection refused)')).toBeTruthy();
  });

  it('shows "Gateway unreachable" on a network error, and Retry recovers', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    renderApp(60_000);
    expect(await screen.findByRole('heading', { name: 'Gateway unreachable' })).toBeTruthy();

    server.use(http.get('/api/health', healthy));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Cluster: reachable')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Gateway unreachable' })).toBeNull();
  });
});
