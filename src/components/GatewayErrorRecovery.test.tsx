import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GatewayConnectionContext } from "./GatewayConnectionContext";
import { GatewayErrorRecovery } from "./GatewayErrorRecovery";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };

describe("GatewayErrorRecovery", () => {
  it("opens credentials for authentication failures", async () => {
    const openConnection = vi.fn();
    render(
      <GatewayConnectionContext.Provider value={openConnection}>
        <GatewayErrorRecovery gateway={gateway} kind="authentication-required" />
      </GatewayConnectionContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Manage credentials for Dev" }));
    expect(openConnection).toHaveBeenCalledWith("dev");
  });

  it("provides transport guidance without claiming the cause", () => {
    render(<GatewayErrorRecovery gateway={gateway} kind="gateway-unreachable" />);
    expect(screen.getByText(/browser cannot determine the cause/).textContent).toContain("certificate is trusted");
  });

  it("omits certificate guidance for an HTTP gateway", () => {
    render(<GatewayErrorRecovery gateway={{ ...gateway, url: "http://gateway.example" }} kind="gateway-unreachable" />);
    expect(screen.getByText(/browser cannot determine the cause/).textContent).not.toContain("certificate");
  });
});
