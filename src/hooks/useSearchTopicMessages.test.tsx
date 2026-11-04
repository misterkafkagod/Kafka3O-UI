import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SearchTopicMessages } from "../gateway/searchTopicMessages";
import { useSearchTopicMessages } from "./useSearchTopicMessages";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const result = { messages: [], scanned: 7, truncated: false };

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSearchTopicMessages", () => {
  it("waits for a submitted query and caches by gateway, topic, and text", async () => {
    const client = new QueryClient();
    const search = vi.fn<SearchTopicMessages>(async () => result);
    const initialProps: { query?: string } = {};
    const { result: hook, rerender } = renderHook(
      ({ query }: { query?: string }) => useSearchTopicMessages(gateway, "orders", search, query),
      { initialProps, wrapper: wrapperFor(client) },
    );
    expect(search).not.toHaveBeenCalled();

    rerender({ query: "order" });
    await waitFor(() => expect(hook.current.data).toEqual(result));
    expect(search).toHaveBeenCalledWith(gateway.url, "orders", "order");
    expect(client.getQueryData(["gateway", "dev", "topic", "orders", "message-search", "order"])).toEqual(result);
  });

  it("does not retry failures", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const search = vi.fn<SearchTopicMessages>(async () => {
      throw new Error("offline");
    });
    const { result: hook } = renderHook(() => useSearchTopicMessages(gateway, "orders", search, "x"), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(hook.current.isError).toBe(true));
    expect(search).toHaveBeenCalledTimes(1);
  });
});
