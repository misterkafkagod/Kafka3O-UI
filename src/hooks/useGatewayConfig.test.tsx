import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useGatewayConfig } from "./useGatewayConfig";

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };

describe("useGatewayConfig", () => {
  it("returns the gateways from the injected loader", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useGatewayConfig(async () => [dev]), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([dev]));
  });
});
