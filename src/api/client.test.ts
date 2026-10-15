import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { ApiError, GatewayUnreachableError, getCluster, getHealth } from './client';

describe('api client', () => {
  it('parses a 200 response', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({ gateway: 'up', cluster: { reachable: true } }),
      ),
    );
    await expect(getHealth()).resolves.toEqual({ gateway: 'up', cluster: { reachable: true } });
  });

  it('turns an error body into ApiError', async () => {
    server.use(
      http.get('/api/cluster', () =>
        HttpResponse.json(
          { error: { code: 'cluster_unreachable', message: 'no brokers' } },
          { status: 503 },
        ),
      ),
    );
    const err = await getCluster().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 503, code: 'cluster_unreachable', message: 'no brokers' });
  });

  it('turns a network error into GatewayUnreachableError', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    await expect(getHealth()).rejects.toBeInstanceOf(GatewayUnreachableError);
  });

  it('treats a non-gateway error response as GatewayUnreachableError', async () => {
    server.use(http.get('/api/health', () => new HttpResponse('proxy error', { status: 502 })));
    await expect(getHealth()).rejects.toBeInstanceOf(GatewayUnreachableError);
  });
});
