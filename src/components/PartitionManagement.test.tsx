import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { KafkaAdministration } from "../gateway/administration";
import { HttpError } from "../gateway/HttpError";
import type { ClusterInfo, TopicDetail } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { useTopicDetail } from "../hooks/useTopicDetail";
import { renderWithQuery } from "../test/renderWithQuery";
import { PartitionManagement } from "./PartitionManagement";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };
const detail: TopicDetail = {
  name: "orders",
  partitions: [
    { id: 0, leader: 1, replicas: [1, 2], isr: [1, 2], startOffset: 0, endOffset: 2 },
    { id: 1, leader: 2, replicas: [2, 3], isr: [2, 3], startOffset: 0, endOffset: 2 },
  ],
  config: [],
};
const cluster: ClusterInfo = {
  clusterId: "test",
  controllerId: 1,
  brokers: [1, 2, 3].map((id) => ({ id, host: `broker-${id}`, port: 9092 })),
};

function administration(overrides: Partial<KafkaAdministration> = {}): KafkaAdministration {
  return {
    getConfigurations: async () => [],
    alterConfiguration: async () => {},
    increasePartitions: async () => {},
    listReassignments: async () => [],
    reassignPartition: async () => {},
    confirmChange: () => true,
    ...overrides,
  };
}

function Harness({ admin }: { admin: KafkaAdministration }) {
  const topic = useTopicDetail(gateway, "orders", async () => detail);
  const brokers = useClusterStatus(gateway, async () => cluster, 60_000);
  if (!topic.data || !brokers.data) return <p>Loading</p>;
  return <PartitionManagement gateway={gateway} detail={topic.data} brokers={brokers.data.brokers} administration={admin} refreshTopic={topic.refetch} refreshCluster={brokers.refetch} ready={!topic.isError && !brokers.isError} />;
}

describe("PartitionManagement", () => {
  it("validates partition increases, requires confirmation, and never duplicates an in-flight write", async () => {
    const user = userEvent.setup();
    let finish = () => {};
    const deferred = new Promise<void>((resolve) => { finish = resolve; });
    const increase = vi.fn(() => deferred);
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    renderWithQuery(<Harness admin={administration({ increasePartitions: increase, confirmChange: confirm })} />);
    const input = await screen.findByLabelText("Desired total partitions");
    await user.clear(input);
    await user.type(input, "2");
    await user.click(screen.getByRole("button", { name: "Review partition increase" }));
    expect(await screen.findByText(/greater than the current partition count/)).toBeDefined();
    expect(increase).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "4");
    await user.click(screen.getByRole("button", { name: "Review partition increase" }));
    expect(increase).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("cannot be undone"));
    await user.click(screen.getByRole("button", { name: "Review partition increase" }));
    expect(increase).toHaveBeenCalledOnce();
    expect(increase).toHaveBeenCalledWith(gateway.url, "orders", 4);
    expect(screen.getAllByRole("button", { name: "Submitting…" })[0].matches(":disabled")).toBe(true);
    finish();
    expect(await screen.findByText(/accepted the partition increase/)).toBeDefined();
  });

  it("rejects empty, duplicate, or unknown brokers and submits a valid ordered assignment", async () => {
    const user = userEvent.setup();
    const alter = vi.fn(async () => {});
    const confirm = vi.fn(() => true);
    renderWithQuery(<Harness admin={administration({ reassignPartition: alter, confirmChange: confirm })} />);
    const input = await screen.findByLabelText("Ordered replica broker IDs");
    await screen.findByText("No active reassignments reported.");
    for (const invalid of ["", "2, 2", "2, 9"]) {
      await user.clear(input);
      if (invalid) await user.type(input, invalid);
      await user.click(screen.getByRole("button", { name: "Review replica assignment" }));
      expect(screen.getByText(/distinct, existing broker IDs/)).toBeDefined();
    }
    expect(alter).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "2, 3");
    await user.click(screen.getByRole("button", { name: "Review replica assignment" }));
    await waitFor(() => expect(alter).toHaveBeenCalledWith(gateway.url, "orders", 0, [2, 3]));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("moves data"));
    expect(await screen.findByText(/accepted the reassignment request/)).toBeDefined();
  });

  it("shows active reassignments and prevents changing the affected partition", async () => {
    const user = userEvent.setup();
    const alter = vi.fn(async () => {});
    renderWithQuery(<Harness admin={administration({
      reassignPartition: alter,
      listReassignments: async () => [{ partition: 0, replicas: [1, 2, 3], addingReplicas: [3], removingReplicas: [1] }],
    })} />);
    expect(await screen.findByRole("table", { name: "Active reassignments" })).toBeDefined();
    expect((screen.getByRole("button", { name: "Review replica assignment" }) as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText("Partition"), "1");
    expect((screen.getByRole("button", { name: "Review replica assignment" }) as HTMLButtonElement).disabled).toBe(false);
    expect(alter).not.toHaveBeenCalled();
  });

  it("blocks another write after an unknown outcome until topic and status refresh", async () => {
    const user = userEvent.setup();
    const increase = vi.fn(async () => { throw new HttpError(503, "unknown", { code: "partition_write_unknown" }); });
    const list = vi.fn(async () => []);
    renderWithQuery(<Harness admin={administration({ increasePartitions: increase, listReassignments: list })} />);
    await screen.findByText("No active reassignments reported.");
    await user.click(await screen.findByRole("button", { name: "Review partition increase" }));
    expect(await screen.findByText(/may have been accepted/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Review partition increase" }).matches(":disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Review replica assignment" }).matches(":disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Refresh topic and status" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Review partition increase" }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByText(/Topic, brokers, and reassignment status refreshed/)).toBeDefined();
    expect(screen.queryByText(/may have been accepted/)).toBeNull();
    expect(increase).toHaveBeenCalledTimes(1);
    expect(list.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
