import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useClusterStatus } from "./useClusterStatus";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const cluster = { clusterId: "abc", controllerId: 1, brokers: [] };

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useClusterStatus", () => {
  it("calls the injected getCluster with the gateway URL and returns its result", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const getCluster = vi.fn(async () => cluster);

    const { result } = renderHook(() => useClusterStatus(gateway, getCluster), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.data).toEqual(cluster));
    expect(getCluster).toHaveBeenCalledWith("http://localhost:8081");
    expect(client.getQueryData(["gateway", "dev", "cluster"])).toEqual(cluster);
  });

  it("does not retry a failed status call", async () => {
    // Client default allows retries; the hook itself must disable them.
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const getCluster = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { result } = renderHook(() => useClusterStatus(gateway, getCluster), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getCluster).toHaveBeenCalledTimes(1);
  });
});
