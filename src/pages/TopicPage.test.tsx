import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { SearchTopicMessages } from "../gateway/searchTopicMessages";
import type { GatewayEntry, TopicMessage, TopicMessagePosition } from "../gateway/types";
import { HttpError } from "../gateway/HttpError";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicPage } from "./TopicPage";

const gateway: GatewayEntry = { id: "dev", name: "Dev", url: "http://localhost:8081" };

function renderTopicPage(
  loadGatewayConfig: LoadGatewayConfig,
  getTopicDetail: GetTopicDetail,
  listLatestTopicMessages: ListLatestTopicMessages = async () => [],
  view: "details" | "messages" = "details",
  searchTopicMessages: SearchTopicMessages = async () => ({ messages: [], scanned: 0, truncated: false }),
  route = `/clusters/dev/topics/orders${view === "messages" ? "/messages" : ""}`,
) {
  const linkOrigin = "https://console.example";
  const copyMessageLink = async () => {};
  const listConsumerGroups = async () => [];
  const produceTopicMessage = async () => ({ partition: 0, offset: "0" });
  const deleteTopic = async () => {};
  const confirmTopicDeletion = () => false;
  return renderWithQuery(
    <Routes>
      <Route
        path="/clusters/:gatewayId/topics/:topicName"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listConsumerGroups, listLatestTopicMessages, searchTopicMessages, produceTopicMessage, deleteTopic, confirmTopicDeletion, linkOrigin, copyMessageLink, view }} />}
      />
      <Route
        path="/clusters/:gatewayId/topics/:topicName/messages"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listConsumerGroups, listLatestTopicMessages, searchTopicMessages, produceTopicMessage, deleteTopic, confirmTopicDeletion, linkOrigin, copyMessageLink, view }} />}
      />
    </Routes>,
    route,
  );
}

describe("TopicPage", () => {
  it("opens message search and forwards the selected gateway and topic", async () => {
    const search = vi.fn<SearchTopicMessages>(async () => ({ messages: [], scanned: 0, truncated: false }));
    const user = userEvent.setup();
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), async () => [], "messages", search);

    await user.click(await screen.findByRole("button", { name: "Search messages" }));
    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "needle");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No matching messages.")).toBeDefined();
    expect(search).toHaveBeenCalledWith(gateway.url, "orders", "needle");
    await user.click(screen.getByRole("button", { name: "Back to message reads" }));
    expect(screen.getByRole("button", { name: "Read messages" })).toBeDefined();
  });

  it("offers message links for search matches", async () => {
    const search = vi.fn<SearchTopicMessages>(async () => ({
      messages: [{ partition: 1, offset: 4, timestamp: "2026-01-02T03:04:05Z", key: null, value: null, headers: [] }],
      scanned: 1,
      truncated: false,
    }));
    const user = userEvent.setup();
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), async () => [], "messages", search);
    await user.click(await screen.findByRole("button", { name: "Search messages" }));
    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "needle");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("button", { name: "Copy link for partition 1 offset 4" })).toBeDefined();
  });

  it("opens a linked large offset and displays only the exact record", async () => {
    const offset = "9007199254740993";
    const list = vi.fn<ListLatestTopicMessages>(async () => [
      { partition: 2, offset: Number(offset), offsetExact: offset, timestamp: "2026-01-02T03:04:05Z", key: null, value: "ZXhhY3Q=", headers: [] },
      { partition: 2, offset: Number("9007199254740994"), offsetExact: "9007199254740994", timestamp: "2026-01-02T03:04:06Z", key: null, value: "bGF0ZXI=", headers: [] },
    ]);
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), list, "messages", undefined, `/clusters/dev/topics/orders/messages?partition=2&offset=${offset}`);

    expect(await screen.findByText("exact")).toBeDefined();
    expect(screen.queryByText("later")).toBeNull();
    expect(list).toHaveBeenCalledWith(gateway.url, "orders", { partition: 2, offset });
    expect(screen.getByRole("link", { name: "Back to message reads" }).getAttribute("href")).toBe("/clusters/dev/topics/orders/messages");
  });

  it("does not display the next record when the linked offset is absent", async () => {
    const list = vi.fn<ListLatestTopicMessages>(async () => [
      { partition: 0, offset: 10, timestamp: "2026-01-02T03:04:05Z", key: null, value: "bGF0ZXI=", headers: [] },
    ]);
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), list, "messages", undefined, "/clusters/dev/topics/orders/messages?partition=0&offset=9");

    expect((await screen.findByRole("alert")).textContent).toContain("No message is available");
    expect(screen.queryByText("later")).toBeNull();
  });

  it("rejects malformed links without fetching messages", async () => {
    const list = vi.fn<ListLatestTopicMessages>(async () => []);
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), list, "messages", undefined, "/clusters/dev/topics/orders/messages?partition=0&offset=not-a-number");

    expect((await screen.findByRole("alert")).textContent).toContain("Invalid message link");
    expect(list).not.toHaveBeenCalled();
  });

  it("marks expired positions unavailable and reports unverifiable legacy offsets", async () => {
    const list = vi.fn<ListLatestTopicMessages>(async () => {
      throw new HttpError(400, "Invalid position", { code: "invalid_position" });
    });
    const first = renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), list, "messages", undefined, "/clusters/dev/topics/orders/messages?partition=0&offset=9");
    expect((await screen.findByRole("alert")).textContent).toContain("No message is available");
    first.unmount();

    const legacy = vi.fn<ListLatestTopicMessages>(async () => [
      { partition: 0, offset: Number("9007199254740993"), timestamp: "2026-01-02T03:04:05Z", key: null, value: null, headers: [] },
    ]);
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), legacy, "messages", undefined, "/clusters/dev/topics/orders/messages?partition=0&offset=9007199254740993");
    expect((await screen.findByRole("alert")).textContent).toContain("cannot be verified");
  });

  it("offers retry when a linked read fails because the gateway is unavailable", async () => {
    const list = vi
      .fn<ListLatestTopicMessages>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([{ partition: 0, offset: 9, timestamp: "2026-01-02T03:04:05Z", key: null, value: "ZXhhY3Q=", headers: [] }]);
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), list, "messages", undefined, "/clusters/dev/topics/orders/messages?partition=0&offset=9");

    const alert = await screen.findByRole("alert");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("exact")).toBeDefined();
  });

  it("shows Cluster not found without fetching topic detail when the gateway is unknown", async () => {
    const getTopicDetail = vi.fn(async () => ({ name: "orders", partitions: [], config: [] }));
    renderTopicPage(async () => [], getTopicDetail);

    expect(await screen.findByRole("heading", { name: "Cluster not found" })).toBeDefined();
    expect(getTopicDetail).not.toHaveBeenCalled();
  });

  it("resolves the configured gateway and topic route", async () => {
    const getTopicDetail = vi.fn(async () => ({ name: "orders", partitions: [], config: [] }));
    renderTopicPage(async () => [gateway], getTopicDetail);

    expect(await screen.findByRole("heading", { name: "orders" })).toBeDefined();
    expect(getTopicDetail).toHaveBeenCalledWith(gateway.url, "orders");
  });

  it("shows loading and an explicit empty state for latest messages", async () => {
    let resolveMessages: ((messages: never[]) => void) | undefined;
    const listLatestTopicMessages = vi.fn(
      () =>
        new Promise<never[]>((resolve) => {
          resolveMessages = resolve;
        }),
    );
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), listLatestTopicMessages, "messages");

    expect(await screen.findByText("Loading messages…")).toBeDefined();
    resolveMessages?.([]);
    expect(await screen.findByText("No messages found.")).toBeDefined();
    expect(listLatestTopicMessages).toHaveBeenCalledWith(gateway.url, "orders");
  });

  it("shows an error with Retry and reloads latest messages", async () => {
    let failed = false;
    const listLatestTopicMessages = vi.fn(async () => {
      if (!failed) {
        failed = true;
        throw new Error("Kafka unavailable");
      }
      return [
        { partition: 0, offset: 0, timestamp: "2026-01-02T03:04:05Z", key: "", value: "dmFsdWU=", headers: [] },
      ];
    });
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), listLatestTopicMessages, "messages");

    const alert = await screen.findByRole("alert");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Topic messages" })).toBeDefined();
    expect(listLatestTopicMessages).toHaveBeenCalledTimes(2);
  });

  it("reads messages from an offset and displays the returned records", async () => {
    const listLatestTopicMessages = vi.fn(
      async (_url: string, _topic: string, position?: TopicMessagePosition): Promise<TopicMessage[]> =>
        position === undefined
          ? []
          : [
              {
                partition: position.partition,
                offset: "offset" in position ? Number(position.offset) : 0,
                timestamp: "2026-01-02T03:04:05Z",
                key: "",
                value: "dmFsdWU=",
                headers: [],
              },
            ],
    );
    const user = userEvent.setup();
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), listLatestTopicMessages, "messages");

    await user.clear(await screen.findByRole("spinbutton", { name: "Partition" }));
    await user.type(screen.getByRole("spinbutton", { name: "Partition" }), "2");
    await user.clear(screen.getByRole("spinbutton", { name: "Offset" }));
    await user.type(screen.getByRole("spinbutton", { name: "Offset" }), "11");
    await user.click(screen.getByRole("button", { name: "Read messages" }));

    expect(await screen.findByRole("table", { name: "Topic messages" })).toBeDefined();
    expect(screen.getByText("value")).toBeDefined();
    expect(listLatestTopicMessages).toHaveBeenLastCalledWith(gateway.url, "orders", { partition: 2, offset: 11 });
  });

  it("reads messages from a timestamp", async () => {
    const listLatestTopicMessages = vi.fn(
      async (_url: string, _topic: string, position?: TopicMessagePosition): Promise<TopicMessage[]> =>
        position === undefined
          ? []
          : [{ partition: position.partition, offset: 12, timestamp: "2026-01-02T03:04:05Z", key: "", value: "", headers: [] }],
    );
    const user = userEvent.setup();
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), listLatestTopicMessages, "messages");

    await user.click(await screen.findByRole("radio", { name: "Timestamp" }));
    await user.clear(screen.getByRole("spinbutton", { name: "Partition" }));
    await user.type(screen.getByRole("spinbutton", { name: "Partition" }), "1");
    await user.clear(screen.getByRole("spinbutton", { name: "Timestamp (Unix milliseconds)" }));
    await user.type(screen.getByRole("spinbutton", { name: "Timestamp (Unix milliseconds)" }), "1700000000123");
    await user.click(screen.getByRole("button", { name: "Read messages" }));

    expect(await screen.findByRole("table", { name: "Topic messages" })).toBeDefined();
    expect(listLatestTopicMessages).toHaveBeenLastCalledWith(gateway.url, "orders", {
      partition: 1,
      timestamp: 1700000000123,
    });
  });

  it("shows the validation detail returned for an invalid position", async () => {
    const listLatestTopicMessages = vi.fn(async (_url: string, _topic: string, position?: TopicMessagePosition) => {
      if (position === undefined) {
        return [];
      }
      throw new HttpError(400, "Invalid position", { code: "invalid_position", detail: "partition 9 does not exist" });
    });
    const user = userEvent.setup();
    renderTopicPage(async () => [gateway], async () => ({ name: "orders", partitions: [], config: [] }), listLatestTopicMessages, "messages");

    await user.clear(await screen.findByRole("spinbutton", { name: "Partition" }));
    await user.type(screen.getByRole("spinbutton", { name: "Partition" }), "9");
    await user.click(screen.getByRole("button", { name: "Read messages" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("partition 9 does not exist")).toBeDefined();
  });
});
