import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useConsumerGroups } from "./useConsumerGroups";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const groups = [{ id: "group", protocol: "classic" as const, state: "Stable", members: [], topics: [], partitions: [] }];

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useConsumerGroups", () => {
  it("uses the gateway URL and isolates its cached groups", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listConsumerGroups = vi.fn(async () => groups);
    const { result } = renderHook(() => useConsumerGroups(gateway, listConsumerGroups), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.data).toEqual(groups));
    expect(listConsumerGroups).toHaveBeenCalledWith(gateway.url);
    expect(client.getQueryData(["gateway", "dev", "consumer-groups"])).toEqual(groups);
    expect(client.getQueryData(["gateway", "other", "consumer-groups"])).toBeUndefined();
  });

  it("does not automatically retry failed calls", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const listConsumerGroups = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { result } = renderHook(() => useConsumerGroups(gateway, listConsumerGroups), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listConsumerGroups).toHaveBeenCalledTimes(1);
  });
});
