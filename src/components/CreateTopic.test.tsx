import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CreateTopic as CreateAction } from "../gateway/createTopic";
import { HttpError } from "../gateway/HttpError";
import { CreateTopic } from "./CreateTopic";
import { GatewayConnectionContext } from "./GatewayConnectionContext";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };

describe("CreateTopic", () => {
  it("validates before sending and refreshes topic lists across gateway aliases", async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const pending = new Promise<void>((done) => { resolve = done; });
    const create = vi.fn<CreateAction>(() => pending);
    const client = new QueryClient();
    client.setQueryData(["gateway", "dev", "topics"], []);
    client.setQueryData(["gateway", "alias", "topics"], []);
    client.setQueryData(["gateway", "dev", "cluster"], "cluster");
    render(<QueryClientProvider client={client}><CreateTopic gateway={gateway} createTopic={create} /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    expect(screen.getByRole("alert").textContent).toContain("1-249");
    expect(create).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Topic name"), "orders");
    await user.clear(screen.getByLabelText("Partitions"));
    await user.type(screen.getByLabelText("Partitions"), "3");
    await user.clear(screen.getByLabelText("Replication factor"));
    await user.type(screen.getByLabelText("Replication factor"), "2");
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    fireEvent.submit(screen.getByRole("form", { name: "Create topic" }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(gateway.url, { name: "orders", partitions: 3, replicationFactor: 2 });
    expect(screen.getByRole("button", { name: "Creating…" }).matches(":disabled")).toBe(true);
    resolve();
    expect(await screen.findByText(/Creation of "orders" was accepted/)).toBeDefined();
    await waitFor(() => expect(client.getQueryState(["gateway", "dev", "topics"])?.isInvalidated).toBe(true));
    expect(client.getQueryState(["gateway", "alias", "topics"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["gateway", "dev", "cluster"])?.isInvalidated).toBe(false);
  });

  it("reports a conflict without retrying", async () => {
    const user = userEvent.setup();
    const create = vi.fn<CreateAction>(async () => { throw new HttpError(409, "conflict"); });
    render(<QueryClientProvider client={new QueryClient()}><CreateTopic gateway={gateway} createTopic={create} /></QueryClientProvider>);
    await user.type(screen.getByLabelText("Topic name"), "orders");
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("offers credential correction for 401 without resubmitting the write", async () => {
    const user = userEvent.setup();
    const openConnection = vi.fn();
    const create = vi.fn<CreateAction>()
      .mockRejectedValueOnce(new HttpError(401, "unauthorized"))
      .mockRejectedValueOnce(new HttpError(409, "conflict"));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <GatewayConnectionContext.Provider value={openConnection}>
          <CreateTopic gateway={gateway} createTopic={create} />
        </GatewayConnectionContext.Provider>
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText("Topic name"), "orders");
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    await user.click(await screen.findByRole("button", { name: "Manage credentials for Dev" }));
    expect(openConnection).toHaveBeenCalledWith("dev");
    expect(create).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
    expect(screen.queryByRole("button", { name: "Manage credentials for Dev" })).toBeNull();
  });

  it("warns when a network error leaves creation uncertain", async () => {
    const user = userEvent.setup();
    const create = vi.fn<CreateAction>(async () => { throw new TypeError("network"); });
    render(<QueryClientProvider client={new QueryClient()}><CreateTopic gateway={gateway} createTopic={create} /></QueryClientProvider>);
    await user.type(screen.getByLabelText("Topic name"), "orders");
    await user.click(screen.getByRole("button", { name: "Create topic" }));
    expect((await screen.findByRole("alert")).textContent).toContain("may already exist");
    expect(create).toHaveBeenCalledTimes(1);
  });
});
