import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { GatewayConnectionContext } from "../components/GatewayConnectionContext";

export function renderWithQuery(ui: ReactElement, route = "/", onOpenGatewayConnection: (gatewayId: string) => void = () => {
  throw new Error("No connection action was supplied to this test.");
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GatewayConnectionContext.Provider value={onOpenGatewayConnection}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </GatewayConnectionContext.Provider>
    </QueryClientProvider>,
  );
}
