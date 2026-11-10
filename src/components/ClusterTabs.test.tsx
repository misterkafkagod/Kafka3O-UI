import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterTabs } from "./ClusterTabs";

describe("ClusterTabs", () => {
  it("links cluster sections for the gateway with Topics first", () => {
    renderWithQuery(<ClusterTabs gatewayId="dev" view="brokers" />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Topics", "Brokers", "Metrics", "Consumer groups", "Broker configuration", "Connect", "Backups"]);
    expect(screen.getByRole("link", { name: "Backups" }).getAttribute("href")).toBe("/clusters/dev/backups");
    expect(screen.getByRole("link", { name: "Metrics" }).getAttribute("href")).toBe("/clusters/dev/metrics");
    expect(screen.getByRole("link", { name: "Connect" }).getAttribute("href")).toBe("/clusters/dev/connect");
    expect(screen.getByRole("link", { name: "Brokers" }).getAttribute("href")).toBe("/clusters/dev/brokers");
    expect(screen.getByRole("link", { name: "Topics" }).getAttribute("href")).toBe("/clusters/dev/topics");
    expect(screen.getByRole("link", { name: "Consumer groups" }).getAttribute("href")).toBe("/clusters/dev/consumer-groups");
  });

  it("encodes gateway IDs and marks the consumer-groups tab", () => {
    renderWithQuery(<ClusterTabs gatewayId="dev & west" view="consumer-groups" />);

    const tab = screen.getByRole("link", { name: "Consumer groups" });
    expect(tab.getAttribute("href")).toBe("/clusters/dev%20%26%20west/consumer-groups");
    expect(tab.getAttribute("aria-current")).toBe("page");
  });

  it("marks the active tab with aria-current", () => {
    renderWithQuery(<ClusterTabs gatewayId="dev" view="topics" />);

    expect(screen.getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Brokers" }).getAttribute("aria-current")).toBeNull();
  });
});
