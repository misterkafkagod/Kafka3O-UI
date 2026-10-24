import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicList } from "./TopicList";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const topic = (name: string) => ({ name, partitions: 1, replicationFactor: 1, internal: false, approxMessages: 0 });

describe("TopicList", () => {
  it("shows Loading topics… while the list loads", () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={() => new Promise(() => {})} />);

    expect(screen.getByText("Loading topics…")).toBeDefined();
  });

  it("shows the topics sorted by name", async () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={async () => [topic("orders"), topic("audit")]} />);

    const table = await screen.findByRole("table", { name: "Topics" });
    const [, body] = within(table).getAllByRole("rowgroup");
    const names = within(body)
      .getAllByRole("row")
      .map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(names).toEqual(["audit", "orders"]);
  });

  it("shows Topics unavailable when the request fails", async () => {
    renderWithQuery(
      <TopicList
        gateway={gateway}
        listTopics={async () => {
          throw new TypeError("Failed to fetch");
        }}
      />,
    );

    expect(await screen.findByText("Topics unavailable")).toBeDefined();
  });
});
