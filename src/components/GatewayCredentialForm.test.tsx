import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import { HttpError } from "../gateway/HttpError";
import { GatewayCredentialForm } from "./GatewayCredentialForm";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };
const validToken = "a".repeat(32);

function credentialsFor(values: Map<string, string>): GatewayCredentials {
  return {
    read: (url) => values.get(url) ?? null,
    save: (url, token) => { values.set(url, token); },
    clear: (url) => { values.delete(url); },
  };
}

describe("GatewayCredentialForm", () => {
  it("stores and removes a token without displaying it, resetting gateway caches", async () => {
    const user = userEvent.setup();
    const values = new Map<string, string>();
    const credentials = credentialsFor(values);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["gateway", "dev", "topics"], ["sensitive old data"]);
    client.setQueryData(["gateway", "alias", "cluster"], "also old");
    render(
      <QueryClientProvider client={client}>
        <GatewayCredentialForm gateway={gateway} credentials={credentials} credentialRevision={0} onCredentialChange={() => {}} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Token for Dev"), validToken);
    await user.click(screen.getByRole("button", { name: "Use token" }));
    expect(values.get(gateway.url)).toBe(validToken);
    expect((screen.getByLabelText("Token for Dev") as HTMLInputElement).value).toBe("");
    expect(document.body.textContent).not.toContain(validToken);
    expect(window.location.href).not.toContain(validToken);
    await waitFor(() => expect(client.getQueryData(["gateway", "dev", "topics"])).toBeUndefined());
    expect(client.getQueryData(["gateway", "alias", "cluster"])).toBeUndefined();

    await user.click(screen.getByRole("button", { name: "Remove token" }));
    expect(values.has(gateway.url)).toBe(false);
    expect(screen.getByText("No token stored.")).toBeDefined();
  });

  it("recovers from a 401 and clears cached data on removal", async () => {
    const user = userEvent.setup();
    const values = new Map<string, string>();
    const credentials = credentialsFor(values);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Status() {
      const { data, isError } = useQuery({
        queryKey: ["gateway", "dev", "cluster"],
        queryFn: async () => {
          if (values.get(gateway.url) !== validToken) throw new HttpError(401, "unauthorized");
          return "Authenticated cluster";
        },
        retry: false,
      });
      return <p>{isError ? "Authentication required" : data}</p>;
    }
    render(
      <QueryClientProvider client={client}>
        <GatewayCredentialForm gateway={gateway} credentials={credentials} credentialRevision={0} onCredentialChange={() => {}} />
        <Status />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Authentication required")).toBeDefined();
    await user.type(screen.getByLabelText("Token for Dev"), validToken);
    await user.click(screen.getByRole("button", { name: "Use token" }));
    expect(await screen.findByText("Authenticated cluster")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Remove token" }));
    expect(await screen.findByText("Authentication required")).toBeDefined();
    expect(screen.queryByText("Authenticated cluster")).toBeNull();
  });

  it("discards an old in-flight response after replacing a token", async () => {
    const user = userEvent.setup();
    const newToken = "b".repeat(32);
    const values = new Map([[gateway.url, validToken]]);
    const credentials = credentialsFor(values);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let resolveOld: (value: string) => void = () => {};
    const oldRequest = new Promise<string>((resolve) => { resolveOld = resolve; });
    const fetchStatus = vi.fn(async () => values.get(gateway.url) === validToken ? oldRequest : "New response");
    function Status() {
      const { data } = useQuery({ queryKey: ["gateway", "dev", "cluster"], queryFn: fetchStatus });
      return <p>{data}</p>;
    }
    render(
      <QueryClientProvider client={client}>
        <GatewayCredentialForm gateway={gateway} credentials={credentials} credentialRevision={0} onCredentialChange={() => {}} />
        <Status />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(fetchStatus).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText("Token for Dev"), newToken);
    await user.click(screen.getByRole("button", { name: "Use token" }));
    expect(await screen.findByText("New response")).toBeDefined();
    resolveOld("Stale response");
    await oldRequest;
    await waitFor(() => expect(client.getQueryData(["gateway", "dev", "cluster"])).toBe("New response"));
    expect(screen.queryByText("Stale response")).toBeNull();
  });

  it("reports invalid tokens and storage failures without disclosing their contents", async () => {
    const user = userEvent.setup();
    const credentials: GatewayCredentials = {
      read: () => null,
      save: vi.fn(() => { throw new Error(validToken); }),
      clear: () => {},
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <GatewayCredentialForm gateway={gateway} credentials={credentials} credentialRevision={0} onCredentialChange={() => {}} />
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText("Token for Dev"), "short");
    await user.click(screen.getByRole("button", { name: "Use token" }));
    expect(screen.getByRole("alert").textContent).toContain("at least 32");
    await user.clear(screen.getByLabelText("Token for Dev"));
    await user.type(screen.getByLabelText("Token for Dev"), validToken);
    await user.click(screen.getByRole("button", { name: "Use token" }));
    expect(screen.getByRole("alert").textContent).toContain("Cannot save");
    expect(screen.getByRole("alert").textContent).not.toContain(validToken);
  });
});
