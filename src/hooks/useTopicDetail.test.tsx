import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TopicDetail } from "../gateway/types";
import { useTopicDetail } from "./useTopicDetail";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const detail: TopicDetail = {
  name: "orders",
  partitions: [],
  config: [],
};

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTopicDetail", () => {
  it("calls the injected function and caches the result by gateway and topic", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const getTopicDetail = vi.fn(async () => detail);

    const { result } = renderHook(() => useTopicDetail(gateway, "orders", getTopicDetail), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.data).toEqual(detail));
    expect(getTopicDetail).toHaveBeenCalledWith("http://localhost:8081", "orders");
    expect(client.getQueryData(["gateway", "dev", "topic", "orders"])).toEqual(detail);
  });

  it("does not retry a failed detail call", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const getTopicDetail = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { result } = renderHook(() => useTopicDetail(gateway, "orders", getTopicDetail), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getTopicDetail).toHaveBeenCalledTimes(1);
  });
});
