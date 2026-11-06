import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DeleteTopic as DeleteAction } from "../gateway/deleteTopic";
import { HttpError } from "../gateway/HttpError";
import { DeleteTopic } from "./DeleteTopic";
import { GatewayConnectionContext } from "./GatewayConnectionContext";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };

describe("DeleteTopic", () => {
  it("sends nothing when the confirmation dialog is cancelled", async () => {
    const user = userEvent.setup();
    const remove = vi.fn<DeleteAction>(async () => {});
    const confirm = vi.fn(() => false);
    render(<QueryClientProvider client={new QueryClient()}>
      <DeleteTopic gateway={gateway} topicName="orders" deleteTopic={remove} confirmTopicDeletion={confirm} />
    </QueryClientProvider>);
    expect(screen.getByRole("region", { name: "Delete topic" }).textContent)
      .toContain("Deleting orders on Dev may permanently remove its messages.");
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect(confirm).toHaveBeenCalledWith("orders");
    expect(remove).not.toHaveBeenCalled();
  });

  it("prevents duplicates, reports asynchronous acceptance, and invalidates caches", async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const pending = new Promise<void>((done) => { resolve = done; });
    const remove = vi.fn<DeleteAction>(() => pending);
    const confirm = vi.fn(() => true);
    const client = new QueryClient();
    client.setQueryData(["gateway", "dev", "topics"], []);
    client.setQueryData(["gateway", "alias", "topics"], []);
    client.setQueryData(["gateway", "dev", "topic", "orders"], {});
    client.setQueryData(["gateway", "alias", "topic", "orders", "messages"], []);
    client.setQueryData(["gateway", "dev", "topic", "audit"], {});
    render(<QueryClientProvider client={client}>
      <DeleteTopic gateway={gateway} topicName="orders" deleteTopic={remove} confirmTopicDeletion={confirm} />
    </QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(gateway.url, "orders");
    expect(screen.getByRole("button", { name: "Requesting deletion…" }).matches(":disabled")).toBe(true);
    resolve();
    expect(await screen.findByText(/Deletion was accepted/)).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Deletion was accepted");
    expect(screen.getByText(/may take time/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Deletion requested" }).matches(":disabled")).toBe(true);
    await waitFor(() => expect(client.getQueryState(["gateway", "dev", "topics"])?.isInvalidated).toBe(true));
    expect(client.getQueryState(["gateway", "alias", "topics"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["gateway", "dev", "topic", "orders"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["gateway", "alias", "topic", "orders", "messages"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["gateway", "dev", "topic", "audit"])?.isInvalidated).toBe(false);
  });

  it("reports missing topics and uncertain deletion without retrying", async () => {
    const user = userEvent.setup();
    const remove = vi.fn<DeleteAction>()
      .mockRejectedValueOnce(new HttpError(404, "missing"))
      .mockRejectedValueOnce(new TypeError("network"));
    render(<QueryClientProvider client={new QueryClient()}>
      <DeleteTopic gateway={gateway} topicName="orders" deleteTopic={remove} confirmTopicDeletion={() => true} />
    </QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not found");
    expect(remove).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("may already be deleting"));
    expect(screen.getByRole("alert").textContent).toContain("browser cannot determine the cause");
    expect(screen.getByRole("alert").textContent).toContain("certificate is trusted");
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("offers credential correction for 401 without resubmitting the deletion", async () => {
    const user = userEvent.setup();
    const openConnection = vi.fn();
    const remove = vi.fn<DeleteAction>()
      .mockRejectedValueOnce(new HttpError(401, "unauthorized"))
      .mockRejectedValueOnce(new HttpError(404, "missing"));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <GatewayConnectionContext.Provider value={openConnection}>
          <DeleteTopic gateway={gateway} topicName="orders" deleteTopic={remove} confirmTopicDeletion={() => true} />
        </GatewayConnectionContext.Provider>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    await user.click(await screen.findByRole("button", { name: "Manage credentials for Dev" }));
    expect(openConnection).toHaveBeenCalledWith("dev");
    expect(remove).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not found");
    expect(screen.queryByRole("button", { name: "Manage credentials for Dev" })).toBeNull();
  });

  it("fails closed if the confirmation dialog cannot be shown", async () => {
    const user = userEvent.setup();
    const remove = vi.fn<DeleteAction>(async () => {});
    render(<QueryClientProvider client={new QueryClient()}>
      <DeleteTopic gateway={gateway} topicName="orders" deleteTopic={remove} confirmTopicDeletion={() => { throw new Error("unavailable"); }} />
    </QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect(screen.getByRole("alert").textContent).toContain("no deletion request was sent");
    expect(remove).not.toHaveBeenCalled();
  });
});
