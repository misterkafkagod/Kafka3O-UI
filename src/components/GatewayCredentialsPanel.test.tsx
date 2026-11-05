import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { GatewayCredentialsPanel } from "./GatewayCredentialsPanel";

describe("GatewayCredentialsPanel", () => {
  it("offers a separate credential form for each configured gateway", async () => {
    const credentials = { read: () => null, save: () => {}, clear: () => {} };
    renderWithQuery(<GatewayCredentialsPanel
      loadGatewayConfig={async () => [
        { id: "dev", name: "Dev", url: "https://dev.example" },
        { id: "prod", name: "Prod", url: "https://prod.example" },
      ]}
      credentials={credentials}
    />);
    await userEvent.click(await screen.findByText("Gateway credentials"));
    expect(within(screen.getByRole("form", { name: "Credentials for Dev" })).getByLabelText("Token for Dev")).toBeDefined();
    expect(within(screen.getByRole("form", { name: "Credentials for Prod" })).getByLabelText("Token for Prod")).toBeDefined();
  });

  it("updates credential state across aliases of the same gateway", async () => {
    const user = userEvent.setup();
    const tokens = new Map<string, string>();
    const credentials = {
      read: (url: string) => tokens.get(url) ?? null,
      save: (url: string, token: string) => { tokens.set(url, token); },
      clear: (url: string) => { tokens.delete(url); },
    };
    renderWithQuery(<GatewayCredentialsPanel
      loadGatewayConfig={async () => [
        { id: "one", name: "One", url: "https://gateway.example" },
        { id: "two", name: "Two", url: "https://gateway.example" },
      ]}
      credentials={credentials}
    />);
    await user.click(await screen.findByText("Gateway credentials"));
    const first = within(screen.getByRole("form", { name: "Credentials for One" }));
    const second = within(screen.getByRole("form", { name: "Credentials for Two" }));
    await user.type(first.getByLabelText("Token for One"), "a".repeat(32));
    await user.click(first.getByRole("button", { name: "Use token" }));
    expect(await second.findByRole("button", { name: "Remove token" })).toBeDefined();
    await user.click(second.getByRole("button", { name: "Remove token" }));
    expect(await first.findByText("No token stored.")).toBeDefined();
  });
});
