import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import ClusterPage from './ClusterPage';

describe('ClusterPage', () => {
  it('lists 3 brokers and marks the controller', async () => {
    server.use(
      http.get('/api/cluster', () =>
        HttpResponse.json({
          clusterId: 'abc123',
          controllerId: 2,
          brokers: [
            { id: 1, host: 'k1', port: 9092, rack: 'a' },
            { id: 2, host: 'k2', port: 9092, rack: null },
            { id: 3, host: 'k3', port: 9093, rack: null },
          ],
        }),
      ),
    );
    render(<ClusterPage />);

    expect(await screen.findByText('abc123')).toBeTruthy();
    const rows = screen.getAllByRole('row').slice(1); // skip the header row
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual(['k1', 'k2', 'k3']);
    expect(within(rows[1]).getByText('Controller')).toBeTruthy();
    expect(within(rows[0]).queryByText('Controller')).toBeNull();
    expect(within(rows[2]).getByText('9093')).toBeTruthy();
  });

  it('shows "Cluster unreachable" on a 503', async () => {
    server.use(
      http.get('/api/cluster', () =>
        HttpResponse.json(
          { error: { code: 'cluster_unreachable', message: 'no brokers' } },
          { status: 503 },
        ),
      ),
    );
    render(<ClusterPage />);
    expect((await screen.findByRole('alert')).textContent).toBe('Cluster unreachable');
  });
});
