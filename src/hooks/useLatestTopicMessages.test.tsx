import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { TopicMessage } from "../gateway/types";
import type { TopicMessagePosition } from "../gateway/types";
import { useLatestTopicMessages } from "./useLatestTopicMessages";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const messages: TopicMessage[] = [
  { partition: 0, offset: 4, timestamp: "2026-01-02T03:04:05Z", key: "", value: "dmFsdWU=", headers: [] },
];

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLatestTopicMessages", () => {
  it("calls the injected function and caches by gateway and topic", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listLatestTopicMessages = vi.fn<ListLatestTopicMessages>(async () => messages);

    const { result } = renderHook(
      () => useLatestTopicMessages(gateway, "orders", listLatestTopicMessages),
      { wrapper: wrapperFor(client) },
    );

    await waitFor(() => expect(result.current.data).toEqual(messages));
    expect(listLatestTopicMessages).toHaveBeenCalledWith("http://localhost:8081", "orders");
    expect(client.getQueryData(["gateway", "dev", "topic", "orders", "messages"])).toEqual(messages);
  });

  it("does not retry a failed request", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    const listLatestTopicMessages = vi.fn<ListLatestTopicMessages>(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { result } = renderHook(
      () => useLatestTopicMessages(gateway, "orders", listLatestTopicMessages),
      { wrapper: wrapperFor(client) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listLatestTopicMessages).toHaveBeenCalledTimes(1);
  });

  it("keeps latest and positioned reads in distinct query cache entries", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listLatestTopicMessages = vi.fn<ListLatestTopicMessages>(async (_url, _topic, position) =>
      position === undefined ? messages : [{ ...messages[0], offset: position.partition }],
    );
    const position: TopicMessagePosition = { partition: 2, offset: 10 };

    const latest = renderHook(() => useLatestTopicMessages(gateway, "orders", listLatestTopicMessages), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(latest.result.current.data).toEqual(messages));
    latest.unmount();

    const positioned = renderHook(() => useLatestTopicMessages(gateway, "orders", listLatestTopicMessages, position), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(positioned.result.current.data).toEqual([{ ...messages[0], offset: 2 }]));
    expect(client.getQueryData(["gateway", "dev", "topic", "orders", "messages"])).toEqual(messages);
    expect(
      client.getQueryData(["gateway", "dev", "topic", "orders", "messages", "position", position]),
    ).toEqual([{ ...messages[0], offset: 2 }]);
  });
});
