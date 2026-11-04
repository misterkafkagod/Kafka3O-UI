import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicTabs } from "./TopicTabs";

describe("TopicTabs", () => {
  it("links and marks Consumers for encoded gateway and topic names", () => {
    renderWithQuery(
      <TopicTabs gateway={{ id: "dev & west", name: "Dev", url: "http://localhost:8081" }} topicName="orders & audit" />,
      "/clusters/dev%20%26%20west/topics/orders%20%26%20audit/consumers",
    );
    const tab = screen.getByRole("link", { name: "Consumers" });
    expect(tab.getAttribute("href")).toBe("/clusters/dev%20%26%20west/topics/orders%20%26%20audit/consumers");
    expect(tab.getAttribute("aria-current")).toBe("page");
  });
});
