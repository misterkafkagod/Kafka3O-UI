import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ProduceMessageResult, ProduceTopicMessage as ProduceAction } from "../gateway/produceTopicMessage";
import { HttpError } from "../gateway/HttpError";
import { GatewayConnectionContext } from "./GatewayConnectionContext";
import { ProduceTopicMessage } from "./ProduceTopicMessage";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };

describe("ProduceTopicMessage", () => {
  it("preserves an empty key, prevents duplicate submissions, and links the exact result", async () => {
    const user = userEvent.setup();
    let resolve: (value: ProduceMessageResult) => void = () => {};
    const pending = new Promise<ProduceMessageResult>((done) => { resolve = done; });
    const produce = vi.fn<ProduceAction>(() => pending);
    const client = new QueryClient();
    client.setQueryData(["gateway", "dev", "topics"], ["orders"]);
    client.setQueryData(["gateway", "dev", "topic", "orders", "messages"], []);
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProduceTopicMessage gateway={gateway} topicName="orders" produceTopicMessage={produce} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(screen.getByLabelText("Include key"));
    await user.click(screen.getByRole("button", { name: "Add header" }));
    await user.type(screen.getByLabelText("Header 1 key"), "source");
    await user.type(screen.getByLabelText("Header 1 value"), "test");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.submit(screen.getByRole("form", { name: "Produce message" }));
    expect(produce).toHaveBeenCalledTimes(1);
    expect(produce).toHaveBeenCalledWith(gateway.url, "orders", {
      value: "", key: "", headers: [{ key: "source", value: "test" }],
    });
    expect(screen.getByRole("button", { name: "Sending…" }).matches(":disabled")).toBe(true);
    resolve({ partition: 2, offset: "9007199254740993" });
    expect(await screen.findByText(/Sent to partition 2, offset 9007199254740993/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Read this message" }).getAttribute("href"))
      .toBe("/clusters/dev/topics/orders/messages?partition=2&offset=9007199254740993");
    await waitFor(() => expect(client.getQueryState(["gateway", "dev", "topics"])?.isInvalidated).toBe(true));
    expect(client.getQueryState(["gateway", "dev", "topic", "orders", "messages"])?.isInvalidated).toBe(true);
  });

  it("warns that a network failure may have delivered the message and never retries", async () => {
    const user = userEvent.setup();
    const produce = vi.fn<ProduceAction>(async () => { throw new TypeError("network"); });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><ProduceTopicMessage gateway={gateway} topicName="orders" produceTopicMessage={produce} /></MemoryRouter>
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText("Value (UTF-8)"), "hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect((await screen.findByRole("alert")).textContent).toContain("may already have been written");
    expect(produce).toHaveBeenCalledTimes(1);
    expect(produce).toHaveBeenCalledWith(gateway.url, "orders", { value: "hello", headers: [] });
  });

  it("shows authentication errors and supports removing a header", async () => {
    const user = userEvent.setup();
    const openConnection = vi.fn();
    const produce = vi.fn<ProduceAction>(async () => { throw new HttpError(401, "unauthorized"); });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <GatewayConnectionContext.Provider value={openConnection}>
          <MemoryRouter><ProduceTopicMessage gateway={gateway} topicName="orders" produceTopicMessage={produce} /></MemoryRouter>
        </GatewayConnectionContext.Provider>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Add header" }));
    await user.click(screen.getByRole("button", { name: "Remove header 1" }));
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Authentication required");
    await user.click(screen.getByRole("button", { name: "Manage credentials for Dev" }));
    expect(openConnection).toHaveBeenCalledWith("dev");
    expect(produce).toHaveBeenCalledTimes(1);
    expect(produce).toHaveBeenCalledWith(gateway.url, "orders", { value: "", headers: [] });
  });
});
