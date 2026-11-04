import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { GatewayEntry } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicPage } from "./TopicPage";

const gateway: GatewayEntry = { id: "dev", name: "Dev", url: "http://localhost:8081" };

function renderTopicPage(loadGatewayConfig: LoadGatewayConfig, getTopicDetail: GetTopicDetail) {
  return renderWithQuery(
    <Routes>
      <Route path="/clusters/:gatewayId/topics/:topicName" element={<TopicPage {...{ loadGatewayConfig, getTopicDetail }} />} />
    </Routes>,
    "/clusters/dev/topics/orders",
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
});
