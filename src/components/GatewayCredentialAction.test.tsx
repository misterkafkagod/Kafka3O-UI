import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GatewayConnectionContext } from "./GatewayConnectionContext";
import { GatewayCredentialAction } from "./GatewayCredentialAction";

describe("GatewayCredentialAction", () => {
  it("opens the selected gateway's credentials", async () => {
    const openConnection = vi.fn();
    render(
      <GatewayConnectionContext.Provider value={openConnection}>
        <GatewayCredentialAction gateway={{ id: "prod", name: "Prod", url: "https://prod.example" }} />
      </GatewayConnectionContext.Provider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Manage credentials for Prod" }));
    expect(openConnection).toHaveBeenCalledWith("prod");
  });

  it("renders nothing in a build without credentials", () => {
    const { container } = render(
      <GatewayConnectionContext.Provider value={null}>
        <GatewayCredentialAction gateway={{ id: "prod", name: "Prod", url: "https://prod.example" }} />
      </GatewayConnectionContext.Provider>,
    );

    expect(container.innerHTML).toBe("");
  });
});
