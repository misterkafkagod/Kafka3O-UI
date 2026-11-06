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
    expect(await screen.findByRole("heading", { name: "orders" })).toBeDefined();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("does not display cached groups after a failed refresh", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce([{ ...group, error: "temporary group error" }])
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={list} />);

    await userEvent.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Retry group data" }));
    expect(await screen.findByText("Gateway unreachable")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "orders" })).toBeNull();
  });

  it("keeps an individual group's error visible and can retry it", async () => {
    const list = vi.fn().mockResolvedValueOnce([{ ...group, error: "group access denied" }]).mockResolvedValueOnce([group]);
    renderWithQuery(<ConsumerGroups gateway={gateway} listConsumerGroups={list} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("group access denied");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry group data" }));
    expect(await screen.findByText("No active members.")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
