import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import type { GatewayEntry } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { GatewayCredentialsPanel } from "./GatewayCredentialsPanel";

function PanelFixture({ credentials, gateways }: { credentials: GatewayCredentials; gateways: GatewayEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <GatewayCredentialsPanel
      loadGatewayConfig={async () => gateways}
      credentials={credentials}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    />
  );
}

describe("GatewayCredentialsPanel", () => {
  it("opens a named dialog with separate forms, initial focus and focus restoration", async () => {
    const user = userEvent.setup();
    const credentials = { read: () => null, save: () => {}, clear: () => {} };
    renderWithQuery(<PanelFixture
      gateways={[
        { id: "dev", name: "Dev", url: "https://dev.example" },
        { id: "prod", name: "Prod", url: "https://prod.example" },
      ]}
      credentials={credentials}
    />);
    const trigger = await screen.findByRole("button", { name: "Gateway credentials" });
    expect(screen.queryByRole("form", { name: "Credentials for Dev" })).toBeNull();
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Gateway credentials" });
    const devInput = within(dialog).getByLabelText("Token for Dev");
    expect(within(dialog).getByRole("form", { name: "Credentials for Prod" })).toBeDefined();
    expect(devInput.getAttribute("type")).toBe("password");
    expect(document.activeElement).toBe(devInput);

    await user.type(devInput, "unfinished");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    expect((screen.getByLabelText("Token for Dev") as HTMLInputElement).value).toBe("");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("updates credential state across aliases of the same gateway", async () => {
    const user = userEvent.setup();
    const tokens = new Map<string, string>();
    const credentials = {
      read: (url: string) => tokens.get(url) ?? null,
      save: (url: string, token: string) => { tokens.set(url, token); },
      clear: (url: string) => { tokens.delete(url); },
    };
    renderWithQuery(<PanelFixture
      gateways={[
        { id: "one", name: "One", url: "https://gateway.example" },
        { id: "two", name: "Two", url: "https://gateway.example" },
      ]}
      credentials={credentials}
    />);
    await user.click(await screen.findByRole("button", { name: "Gateway credentials" }));
    const first = within(screen.getByRole("form", { name: "Credentials for One" }));
    const second = within(screen.getByRole("form", { name: "Credentials for Two" }));
    await user.type(first.getByLabelText("Token for One"), "a".repeat(32));
    await user.click(first.getByRole("button", { name: "Use token" }));
    expect(await second.findByRole("button", { name: "Remove token" })).toBeDefined();
    await user.click(second.getByRole("button", { name: "Remove token" }));
    expect(await first.findByText("No token stored.")).toBeDefined();
  });
});
