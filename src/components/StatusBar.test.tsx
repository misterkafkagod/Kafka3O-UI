import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('shows gateway up and cluster reachable', () => {
    render(<StatusBar health={{ gateway: 'up', cluster: { reachable: true } }} />);
    expect(screen.getByRole('status').textContent).toBe('Gateway: up · Cluster: reachable');
  });

  it('shows the error when the cluster is unreachable', () => {
    render(
      <StatusBar
        health={{ gateway: 'up', cluster: { reachable: false, error: 'connection refused' } }}
      />,
    );
    const status = screen.getByRole('status').textContent;
    expect(status).toContain('Gateway: up');
    expect(status).toContain('Cluster: unreachable');
    expect(status).toContain('connection refused');
  });
});
