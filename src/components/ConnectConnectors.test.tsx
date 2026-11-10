import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ConnectConnector, ListConnectors } from "../gateway/listConnectors";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConnectConnectors } from "./ConnectConnectors";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };
const connectors: ConnectConnector[] = [
  { name: "kafka3o-verify-failing", type: "sink", state: "RUNNING", workerId: "0.0.0.0:8083",
    tasks: [{ id: 0, state: "FAILED", workerId: "0.0.0.0:8083", error: "ConnectException: Couldn't find or create file" }] },
  { name: "kafka3o-verify-paused", type: "sink", state: "PAUSED", workerId: "0.0.0.0:8083", tasks: [{ id: 0, state: "PAUSED", workerId: "0.0.0.0:8083" }] },
];

describe("ConnectConnectors", () => {
  it("lists connectors, task states and error summaries", async () => {
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={vi.fn<ListConnectors>().mockResolvedValue(connectors)} />);

    const table = await screen.findByRole("table", { name: "Kafka Connect connectors" });
    const failing = within(table).getByRole("rowheader", { name: "kafka3o-verify-failing" }).closest("tr")!;
    expect(within(failing).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["sink", "RUNNING", "0.0.0.0:8083", "Task 0: FAILED"]);
    expect(within(screen.getByRole("list", { name: "Errors for kafka3o-verify-failing" })).getByRole("listitem").textContent)
      .toBe("Task 0: ConnectException: Couldn't find or create file");
    const paused = within(table).getByRole("rowheader", { name: "kafka3o-verify-paused" }).closest("tr")!;
    expect(within(paused).getAllByRole("cell")[1].textContent).toBe("PAUSED");
    expect(screen.queryByRole("list", { name: "Errors for kafka3o-verify-paused" })).toBeNull();
    expect(screen.getByText("2 connectors")).toBeDefined();
  });

  it("says when the cluster has no Connect", async () => {
    const list = vi.fn<ListConnectors>().mockRejectedValue(new HttpError(404, "missing", { code: "connect_not_configured" }));
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={list} />);

    expect((await screen.findByText("Kafka Connect is not configured for this cluster.")).getAttribute("role")).toBe("status");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("offers Retry when Connect is unreachable", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListConnectors>().mockRejectedValueOnce(new HttpError(503, "down", { code: "connect_unreachable" })).mockResolvedValue([]);
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={list} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Kafka Connect is unreachable.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No connectors.")).toBeDefined();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
