import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useClusterStatus } from "./useClusterStatus";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const cluster = { clusterId: "abc", controllerId: 1, brokers: [] };

describe("useClusterStatus", () => {
  it("calls the injected getCluster with the gateway URL and returns its result", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const getCluster = vi.fn(async () => cluster);

    const { result } = renderHook(() => useClusterStatus(gateway, getCluster), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(cluster));
    expect(getCluster).toHaveBeenCalledWith("http://localhost:8081");
    expect(client.getQueryData(["gateway", "dev", "cluster"])).toEqual(cluster);
  });
});
