// The only module that talks to the gateway. Components never call fetch.
import type { ClusterInfo, ErrorBody, Health } from './types';

/** The gateway answered with an error body, e.g. code "cluster_unreachable". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** The gateway itself could not be reached. */
export class GatewayUnreachableError extends Error {
  constructor(message = 'Gateway unreachable') {
    super(message);
    this.name = 'GatewayUnreachableError';
  }
}

function isErrorBody(v: unknown): v is ErrorBody {
  if (typeof v !== 'object' || v === null || !('error' in v)) return false;
  const e = (v as { error: unknown }).error;
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(new URL(path, window.location.origin), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new GatewayUnreachableError();
  }

  if (res.ok) return (await res.json()) as T;

  const body: unknown = await res.json().catch(() => null);
  if (isErrorBody(body)) {
    throw new ApiError(res.status, body.error.code, body.error.message);
  }
  // No gateway error body: something in between (e.g. the dev proxy)
  // answered because the gateway is down.
  throw new GatewayUnreachableError(`Gateway unreachable (HTTP ${res.status})`);
}

export const getHealth = () => request<Health>('/api/health');
export const getCluster = () => request<ClusterInfo>('/api/cluster');
