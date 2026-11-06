import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SearchTopicMessages as SearchTopicMessagesAction } from "../gateway/searchTopicMessages";
import { renderWithQuery } from "../test/renderWithQuery";
import { SearchTopicMessages } from "./SearchTopicMessages";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const message = { partition: 1, offset: 7, timestamp: "2026-01-02T03:04:05Z", key: "", value: "b3JkZXI=", headers: [] };

describe("SearchTopicMessages", () => {
  it("announces a pending message search", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SearchTopicMessages gateway={gateway} topicName="orders" searchTopicMessages={() => new Promise<never>(() => {})} />);

    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "order");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("status").textContent).toBe("Searching messages…");
    expect(screen.queryByText("No matching messages.")).toBeNull();
  });

  it("shows matches, examined count, limit, and excluded offsets", async () => {
    const search = vi.fn<SearchTopicMessagesAction>(async () => ({ messages: [message], scanned: 500, truncated: true }));
    const user = userEvent.setup();
    renderWithQuery(<SearchTopicMessages gateway={gateway} topicName="orders" searchTopicMessages={search} />);

    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "order");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Examined 500 records (limit: 500 offset positions).")).toBeDefined();
    expect(screen.getByText("Older offsets or partitions were excluded from this search.")).toBeDefined();
    expect(screen.getByRole("region", { name: "Message results" })).toBeDefined();
    expect(search).toHaveBeenCalledWith(gateway.url, "orders", "order");
  });

  it("shows an empty result without claiming offsets were excluded", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <SearchTopicMessages gateway={gateway} topicName="orders" searchTopicMessages={async () => ({ messages: [], scanned: 3, truncated: false })} />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "missing");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No matching messages.")).toBeDefined();
    expect(screen.getByText("No available offsets were excluded from this search.")).toBeDefined();
    expect(screen.getByText("Examined 3 records (limit: 500 offset positions).")).toBeDefined();
  });

  it("rejects empty text before calling the gateway", async () => {
    const search = vi.fn<SearchTopicMessagesAction>();
    renderWithQuery(<SearchTopicMessages gateway={gateway} topicName="orders" searchTopicMessages={search} />);

    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("alert").textContent).toContain("Enter search text");
    expect(search).not.toHaveBeenCalled();
  });

  it("hides stale success after a failed repeat search and retries", async () => {
    const search = vi
      .fn<SearchTopicMessagesAction>()
      .mockResolvedValueOnce({ messages: [message], scanned: 1, truncated: false })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ messages: [], scanned: 0, truncated: false });
    const user = userEvent.setup();
    renderWithQuery(<SearchTopicMessages gateway={gateway} topicName="orders" searchTopicMessages={search} />);
    await user.type(screen.getByRole("searchbox", { name: "Search key or value" }), "x");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("region", { name: "Message results" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Search" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("offline")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Message results" })).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No matching messages.")).toBeDefined();
    expect(search).toHaveBeenCalledTimes(3);
  });
});
