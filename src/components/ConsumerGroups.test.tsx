import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConsumerGroups } from "./ConsumerGroups";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const group: ConsumerGroup = { id: "orders", protocol: "classic", state: "Empty", members: [], topics: [], partitions: [] };

describe("ConsumerGroups", () => {
  it("shows loading and empty states", async () => {
    const pending = renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={() => new Promise(() => {})} />);
    expect(screen.getByRole("status").textContent).toBe("Loading consumer groups…");
    pending.unmount();

    renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={async () => []} />);
    expect(await screen.findByText("No consumer groups.")).toBeDefined();
  });

  it("shows gateway errors and retries", async () => {
    const list = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([group]);
    renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={list} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: "orders" })).toBeDefined();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("lists groups and marks an incomplete group without stacking every group's details", async () => {
    renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={async () => [{ ...group, error: "group access denied" }]} />);

    const table = await screen.findByRole("table", { name: "Consumer groups" });
    expect(within(table).getByRole("link", { name: "orders" }).getAttribute("href")).toBe("/clusters/dev/consumer-groups/orders");
    expect(within(table).getByText("Group data incomplete")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Consumer group orders" })).toBeNull();
  });
});
