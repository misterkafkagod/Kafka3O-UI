import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ConnectConnector, ListConnectors } from "../gateway/listConnectors";
import type { ConnectorActions, RunConnectorAction } from "../gateway/runConnectorAction";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
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

  it("pauses, resumes and restarts after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListConnectors>().mockResolvedValue(connectors);
    const actions: ConnectorActions = { run: vi.fn<RunConnectorAction>().mockResolvedValue(undefined), confirm: vi.fn(() => true) };
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={list} actions={actions} />);
    await screen.findByRole("table", { name: "Kafka Connect connectors" });

    await user.click(screen.getByRole("button", { name: "Pause kafka3o-verify-failing" }));
    expect(actions.confirm).toHaveBeenLastCalledWith('Pause connector "kafka3o-verify-failing"?');
    expect(actions.run).toHaveBeenLastCalledWith("https://gw", { kind: "pause", connector: "kafka3o-verify-failing" });
    expect((await screen.findByText("Pause requested for kafka3o-verify-failing.")).getAttribute("role")).toBe("status");
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "Resume kafka3o-verify-paused" }));
    expect(actions.run).toHaveBeenLastCalledWith("https://gw", { kind: "resume", connector: "kafka3o-verify-paused" });
    await user.click(screen.getByRole("button", { name: "Restart kafka3o-verify-paused" }));
    expect(actions.confirm).toHaveBeenLastCalledWith('Restart connector "kafka3o-verify-paused" and its tasks?');
    expect(actions.run).toHaveBeenLastCalledWith("https://gw", { kind: "restart", connector: "kafka3o-verify-paused" });
    await user.click(screen.getByRole("button", { name: "Restart task 0 of kafka3o-verify-failing" }));
    expect(actions.confirm).toHaveBeenLastCalledWith('Restart task 0 of connector "kafka3o-verify-failing"?');
    expect(actions.run).toHaveBeenLastCalledWith("https://gw", { kind: "restart-task", connector: "kafka3o-verify-failing", task: 0 });
    expect(await screen.findByText("Restart requested for task 0 of kafka3o-verify-failing.")).toBeDefined();
  });

  it("sends nothing when the confirmation is canceled and explains failures", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunConnectorAction>();
    const confirm = vi.fn(() => false);
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={vi.fn<ListConnectors>().mockResolvedValue(connectors)} actions={{ run, confirm }} />);
    await user.click(await screen.findByRole("button", { name: "Pause kafka3o-verify-failing" }));
    expect(run).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    for (const [failure, message] of [
      [new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: production_admin_required" }), "This is a Production cluster: only an ADMIN for it may change it."],
      [new HttpError(503, "unknown", { code: "connect_action_unknown" }), "The action may have been applied. Refresh before retrying."],
      [new HttpError(409, "rejected", { code: "connect_rejected" }), "Kafka Connect rejected the action. Refresh and try again."],
      [new ProductionChangeCanceled(), "Canceled; nothing was sent."],
    ] as const) {
      run.mockRejectedValueOnce(failure);
      await user.click(screen.getByRole("button", { name: "Restart kafka3o-verify-failing" }));
      expect((await screen.findByRole("alert")).textContent).toBe(message);
    }
  });

  it("is read-only without actions", async () => {
    renderWithQuery(<ConnectConnectors gateway={gateway} listConnectors={vi.fn<ListConnectors>().mockResolvedValue(connectors)} />);
    await screen.findByRole("table", { name: "Kafka Connect connectors" });
    expect(screen.queryByRole("button", { name: /^(Pause|Resume|Restart)/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
  });
});
