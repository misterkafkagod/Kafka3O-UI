import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ListTopics } from "../gateway/listTopics";
import { HttpError } from "../gateway/HttpError";
import type { Topic } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { CrossClusterTopicSearch } from "./CrossClusterTopicSearch";

const gateways = [
  { id: "dev", name: "Dev", url: "http://localhost:8081" },
  { id: "prod", name: "Prod", url: "http://localhost:8082" },
];
const topic = (name: string, internal = false): Topic => ({
  name,
  partitions: 1,
  replicationFactor: 1,
  internal,
  approxMessages: 0,
});

describe("CrossClusterTopicSearch", () => {
  it("searches all gateways independently by case-insensitive name, including internal topics", async () => {
    const listTopics = vi.fn<ListTopics>(async (url) =>
      url === gateways[0].url ? [topic("orders & audit"), topic("__orders", true), topic("other")] : [topic("ORDERS")],
    );
    const user = userEvent.setup();
    renderWithQuery(<CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />);
    expect(listTopics).not.toHaveBeenCalled();

    await user.type(screen.getByRole("searchbox", { name: "Topic name" }), "ORD");
    const dev = screen.getByRole("region", { name: "Dev topic results" });
    const prod = screen.getByRole("region", { name: "Prod topic results" });
    expect((await within(dev).findByRole("link", { name: "orders & audit" })).getAttribute("href")).toBe(
      "/clusters/dev/topics/orders%20%26%20audit",
    );
    expect(within(dev).getByRole("link", { name: "__orders" })).toBeDefined();
    expect(dev.textContent).toContain("(internal)");
    expect(within(dev).queryByText("other")).toBeNull();
    expect((await within(prod).findByRole("link", { name: "ORDERS" })).getAttribute("href")).toBe(
      "/clusters/prod/topics/ORDERS",
    );
    expect(listTopics).toHaveBeenCalledTimes(2);
  });

  it("keeps successful matches visible when one gateway fails and can retry the failed gateway", async () => {
    let prodFailed = false;
    const listTopics = vi.fn<ListTopics>(async (url) => {
      if (url === gateways[1].url && !prodFailed) {
        prodFailed = true;
        throw new Error("offline");
      }
      return [topic("orders")];
    });
    const user = userEvent.setup();
    renderWithQuery(<CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />);

    await user.type(screen.getByRole("searchbox", { name: "Topic name" }), "ord");
    const dev = screen.getByRole("region", { name: "Dev topic results" });
    const prod = screen.getByRole("region", { name: "Prod topic results" });
    expect(await within(dev).findByRole("link", { name: "orders" })).toBeDefined();
    const alert = await within(prod).findByRole("alert");
    expect(within(alert).getByText("offline")).toBeDefined();
    expect(within(prod).queryByText('No topics match "ord".')).toBeNull();
    expect(within(dev).getByRole("link", { name: "orders" })).toBeDefined();
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await within(prod).findByRole("link", { name: "orders" })).toBeDefined();
  });

  it("opens credentials for the failed gateway without hiding another gateway's matches", async () => {
    const openConnection = vi.fn();
    const user = userEvent.setup();
    const listTopics: ListTopics = async (url) => {
      if (url === gateways[1].url) throw new HttpError(401, "unauthorized");
      return [topic("orders")];
    };
    renderWithQuery(<CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />, "/", openConnection);

    await user.type(screen.getByRole("searchbox", { name: "Topic name" }), "ord");
    const dev = screen.getByRole("region", { name: "Dev topic results" });
    const prod = screen.getByRole("region", { name: "Prod topic results" });
    expect(await within(dev).findByRole("link", { name: "orders" })).toBeDefined();
    await user.click(await within(prod).findByRole("button", { name: "Manage credentials for Prod" }));
    expect(openConnection).toHaveBeenCalledWith("prod");
    expect(within(dev).getByRole("link", { name: "orders" })).toBeDefined();
  });

  it("reports no matches per gateway without blocking on another gateway", async () => {
    const listTopics = vi.fn<ListTopics>((url) =>
      url === gateways[0].url ? Promise.resolve([topic("audit")]) : new Promise<never>(() => {}),
    );
    const user = userEvent.setup();
    renderWithQuery(<CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />);

    await user.type(screen.getByRole("searchbox", { name: "Topic name" }), "ord");
    expect(await within(screen.getByRole("region", { name: "Dev topic results" })).findByText('No topics match "ord".')).toBeDefined();
    expect(within(screen.getByRole("region", { name: "Prod topic results" })).getByRole("status").textContent).toBe("Loading topics…");
  });
});
