import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { TopicDetail } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicDetailPage } from "./TopicDetailPage";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const deleteTopic = async () => {};
const confirmTopicDeletion = () => false;
const detail: TopicDetail = {
  name: "orders",
  partitions: [
    { id: 0, leader: 1, replicas: [1, 2], isr: [1], startOffset: 3, endOffset: 9 },
    { id: 1, leader: 2, replicas: [2, 1], isr: [2, 1], startOffset: 0, endOffset: 5 },
  ],
  config: [
    { name: "cleanup.policy", value: "compact", sensitive: false },
    { name: "secret", value: "must-not-leak", sensitive: true },
  ],
};

describe("TopicDetailPage", () => {
  it("announces topic loading", () => {
    renderWithQuery(<TopicDetailPage gateway={gateway} topicName="orders" getTopicDetail={() => new Promise<never>(() => {})} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />);

    expect(screen.getByRole("status").textContent).toBe("Loading topic…");
  });

  it("shows partition metadata and topic config without exposing sensitive values", async () => {
    renderWithQuery(<TopicDetailPage gateway={gateway} topicName="orders" getTopicDetail={async () => detail} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />);

    expect(await screen.findByRole("heading", { name: "orders" })).toBeDefined();
    expect(screen.getByText("2 partitions")).toBeDefined();
    expect(screen.getByText("2 configuration entries")).toBeDefined();
    expect(screen.getByRole("region", { name: "Partitions" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Configuration" })).toBeDefined();
    const partitionRegion = screen.getByRole("region", { name: "Topic partitions table scroll area" });
    const partitions = within(within(partitionRegion).getByRole("table", { name: "Topic partitions" }));
    const rows = partitions.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["0", "1", "1, 2", "1", "3", "9"],
      ["1", "2", "2, 1", "2, 1", "0", "5"],
    ]);

    const configRegion = screen.getByRole("region", { name: "Topic configuration table scroll area" });
    const config = within(within(configRegion).getByRole("table", { name: "Topic configuration" }));
    expect(config.getByText("compact")).toBeDefined();
    expect(config.getByText("Sensitive value hidden")).toBeDefined();
    expect(config.queryByText("must-not-leak")).toBeNull();
  });

  it("shows Topic not found for a deleted topic", async () => {
    renderWithQuery(
      <TopicDetailPage
        gateway={gateway}
        topicName="orders"
        deleteTopic={deleteTopic}
        confirmTopicDeletion={confirmTopicDeletion}
        getTopicDetail={async () => {
          throw new HttpError(404, "Not found", { code: "not_found" });
        }}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Topic not found" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to topics" }).getAttribute("href")).toBe("/clusters/dev/topics");
  });

  it("encodes gateway IDs in both topic back links", async () => {
    const encodedGateway = { ...gateway, id: "dev/west" };
    const page = renderWithQuery(
      <TopicDetailPage gateway={encodedGateway} topicName="orders" getTopicDetail={async () => detail} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />,
    );

    expect((await screen.findByRole("link", { name: "Back to topics" })).getAttribute("href")).toBe("/clusters/dev%2Fwest/topics");
    page.unmount();
    renderWithQuery(
      <TopicDetailPage gateway={encodedGateway} topicName="orders" getTopicDetail={async () => { throw new HttpError(404, "Not found"); }} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />,
    );
    expect((await screen.findByRole("link", { name: "Back to topics" })).getAttribute("href")).toBe("/clusters/dev%2Fwest/topics");
  });

  it("shows unavailable with Retry, then the topic detail", async () => {
    let failed = false;
    renderWithQuery(
      <TopicDetailPage
        gateway={gateway}
        topicName="orders"
        deleteTopic={deleteTopic}
        confirmTopicDeletion={confirmTopicDeletion}
        getTopicDetail={async () => {
          if (!failed) {
            failed = true;
            throw new HttpError(503, "Cluster unreachable", { code: "cluster_unreachable", detail: "Kafka is down" });
          }
          return detail;
        }}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Cluster unreachable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Topic partitions" })).toBeDefined();
  });
});
