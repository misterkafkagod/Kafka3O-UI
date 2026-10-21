import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

const pendingGetCluster = () => new Promise<never>(() => {});

describe("App", () => {
  it("renders the Kafka3O header", () => {
    render(<App queryClient={new QueryClient()} loadGatewayConfig={async () => []} getCluster={pendingGetCluster} statusRefreshMs={60_000} />);

    expect(screen.getByRole("heading", { name: "Kafka3O" })).toBeDefined();
  });

  it("renders the clusters page with the injected config loader", async () => {
    render(<App queryClient={new QueryClient()} loadGatewayConfig={async () => []} getCluster={pendingGetCluster} statusRefreshMs={60_000} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
