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
) {
  return renderWithQuery(
    <Routes>
      <Route
        path="/clusters/:gatewayId/topics/:topicName"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listLatestTopicMessages, searchTopicMessages, view }} />}
      />
      <Route
        path="/clusters/:gatewayId/topics/:topicName/messages"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listLatestTopicMessages, searchTopicMessages, view }} />}
      />
    </Routes>,
    `/clusters/dev/topics/orders${view === "messages" ? "/messages" : ""}`,
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
                offset: "offset" in position ? position.offset : 0,
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
