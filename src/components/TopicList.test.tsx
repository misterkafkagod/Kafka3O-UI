import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicList } from "./TopicList";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const topic = (name: string, internal = false) => ({ name, partitions: 1, replicationFactor: 1, internal, approxMessages: 0 });

function topicNames() {
  const [, body] = within(screen.getByRole("table", { name: "Topics" })).getAllByRole("rowgroup");
  return within(body)
    .getAllByRole("row")
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

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

  it("hides internal topics until Show internal is on (F3-AC2)", async () => {
    renderWithQuery(
      <TopicList gateway={gateway} listTopics={async () => [topic("orders"), topic("__consumer_offsets", true)]} />,
    );

    await screen.findByRole("table", { name: "Topics" });
    expect(topicNames()).toEqual(["orders"]);
    const toggle = screen.getByRole("checkbox", { name: "Show internal" });
    expect((toggle as HTMLInputElement).checked).toBe(false);

    await userEvent.click(toggle);

    expect(topicNames()).toEqual(["__consumer_offsets", "orders"]);
  });

  it("shows No topics when only internal topics exist (F3-AC4)", async () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={async () => [topic("__consumer_offsets", true)]} />);

    expect(await screen.findByText("No topics")).toBeDefined();
    expect(screen.queryByRole("table", { name: "Topics" })).toBeNull();
  });

  it("filters by name ignoring case (F3-AC3)", async () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={async () => [topic("orders"), topic("audit")]} />);

    await screen.findByRole("table", { name: "Topics" });
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter topics" }), "ORD");

    expect(topicNames()).toEqual(["orders"]);
  });

  it("shows No topics match when nothing matches", async () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={async () => [topic("orders"), topic("audit")]} />);

    await screen.findByRole("table", { name: "Topics" });
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter topics" }), "zzz");

    expect(screen.getByText('No topics match "zzz"')).toBeDefined();
    expect(screen.queryByText("No topics")).toBeNull();
    expect(screen.queryByRole("table", { name: "Topics" })).toBeNull();
  });

  it("keeps No topics when only internal topics exist, even with filter text", async () => {
    renderWithQuery(<TopicList gateway={gateway} listTopics={async () => [topic("__consumer_offsets", true)]} />);

    await userEvent.type(await screen.findByRole("searchbox", { name: "Filter topics" }), "zzz");

    expect(screen.getByText("No topics")).toBeDefined();
  });
});
