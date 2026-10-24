import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterTabs } from "./ClusterTabs";

describe("ClusterTabs", () => {
  it("links Brokers and Topics for the gateway", () => {
    renderWithQuery(<ClusterTabs gatewayId="dev" view="brokers" />);

    expect(screen.getByRole("link", { name: "Brokers" }).getAttribute("href")).toBe("/clusters/dev");
    expect(screen.getByRole("link", { name: "Topics" }).getAttribute("href")).toBe("/clusters/dev/topics");
  });

  it("marks the active tab with aria-current", () => {
    renderWithQuery(<ClusterTabs gatewayId="dev" view="topics" />);

    expect(screen.getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Brokers" }).getAttribute("aria-current")).toBeNull();
  });
});
