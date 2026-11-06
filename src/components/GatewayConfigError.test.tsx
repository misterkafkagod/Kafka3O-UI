import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GatewayConfigError } from "./GatewayConfigError";

describe("GatewayConfigError", () => {
  it("explains the configuration failure and offers a retry", async () => {
    const retry = vi.fn();
    render(<GatewayConfigError onRetry={retry} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Gateway configuration unavailable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
