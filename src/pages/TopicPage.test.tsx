import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { GatewayEntry } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicPage } from "./TopicPage";

const gateway: GatewayEntry = { id: "dev", name: "Dev", url: "http://localhost:8081" };

function renderTopicPage(
  loadGatewayConfig: LoadGatewayConfig,
  getTopicDetail: GetTopicDetail,
  listLatestTopicMessages: ListLatestTopicMessages = async () => [],
  view: "details" | "messages" = "details",
) {
  return renderWithQuery(
    <Routes>
      <Route
        path="/clusters/:gatewayId/topics/:topicName"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listLatestTopicMessages, view }} />}
      />
      <Route
        path="/clusters/:gatewayId/topics/:topicName/messages"
        element={<TopicPage {...{ loadGatewayConfig, getTopicDetail, listLatestTopicMessages, view }} />}
      />
    </Routes>,
    `/clusters/dev/topics/orders${view === "messages" ? "/messages" : ""}`,
  );
}

describe("TopicPage", () => {
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
});
