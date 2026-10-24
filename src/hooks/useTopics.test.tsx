import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useTopics } from "./useTopics";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const topics = [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 1000 }];

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTopics", () => {
  it("calls the injected listTopics with the gateway URL and returns its result", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listTopics = vi.fn(async () => topics);

    const { result } = renderHook(() => useTopics(gateway, listTopics), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.data).toEqual(topics));
    expect(listTopics).toHaveBeenCalledWith("http://localhost:8081");
    expect(client.getQueryData(["gateway", "dev", "topics"])).toEqual(topics);
  });

  it("does not retry a failed call", async () => {
    // Client default allows retries; the hook itself must disable them.
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const listTopics = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { result } = renderHook(() => useTopics(gateway, listTopics), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listTopics).toHaveBeenCalledTimes(1);
  });
});
