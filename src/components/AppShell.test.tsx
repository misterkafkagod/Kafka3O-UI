import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { AppShell } from "./AppShell";

const gateway = { id: "dev", name: "Dev", url: "https://dev.example" };
const credentials = { read: () => null, save: () => undefined, clear: () => undefined };
const shell = (sessionIndicator?: React.ReactNode, administrationLink?: boolean) => (
  <AppShell loadGatewayConfig={async () => []} credentials={credentials} connectionOpen={false}
    onOpenConnection={() => undefined} onOpenGatewayConnection={() => undefined} onCloseConnection={() => undefined}
    sessionIndicator={sessionIndicator} administrationLink={administrationLink}>
    <p>Page content</p>
  </AppShell>
);

describe("AppShell", () => {
  it("shows the session indicator inside the header", () => {
    renderWithQuery(shell(<div role="group" aria-label="Console session">Signed in as admin</div>));

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("group", { name: "Console session" }).textContent).toBe("Signed in as admin");
    expect(screen.getByText("Page content")).toBeTruthy();
  });

  it("keeps the header unchanged without an indicator", () => {
    renderWithQuery(shell());

    expect(within(screen.getByRole("banner")).queryByRole("group", { name: "Console session" })).toBeNull();
    expect(within(screen.getByRole("banner")).getByRole("link", { name: "Kafka3O" })).toBeTruthy();
  });

  it("links the Administration page only when told to", () => {
    const { unmount } = renderWithQuery(shell(undefined, true), "/administration");

    const link = within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Administration" });
    expect(link.getAttribute("href")).toBe("/administration");
    expect(link.getAttribute("aria-current")).toBe("page");
    unmount();
    renderWithQuery(shell());
    expect(screen.queryByRole("link", { name: "Administration" })).toBeNull();
  });

  it("leaves out the credentials control in the secured build", async () => {
    renderWithQuery(
      <AppShell loadGatewayConfig={async () => [gateway]} credentials={credentials} connectionOpen={false}
        onOpenConnection={() => undefined} onOpenGatewayConnection={() => undefined} onCloseConnection={() => undefined}
        credentialsControl={false}>
        <p>Page content</p>
      </AppShell>,
    );
    expect(await screen.findByText("Page content")).toBeDefined();
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Gateway credentials/ })).toBeNull();
  });

  it("keeps the credentials control in other builds", async () => {
    renderWithQuery(
      <AppShell loadGatewayConfig={async () => [gateway]} credentials={credentials} connectionOpen={false}
        onOpenConnection={() => undefined} onOpenGatewayConnection={() => undefined} onCloseConnection={() => undefined}>
        <p>Page content</p>
      </AppShell>,
    );
    expect(await within(screen.getByRole("banner")).findByRole("button", { name: /Gateway credentials/ })).toBeDefined();
  });

  it("adds the group to the breadcrumb on a consumer group page", async () => {
    renderWithQuery(
      <AppShell loadGatewayConfig={async () => [gateway]} credentials={credentials} connectionOpen={false}
        onOpenConnection={() => undefined} onOpenGatewayConnection={() => undefined} onCloseConnection={() => undefined}>
        <p>Page content</p>
      </AppShell>,
      `/clusters/dev/consumer-groups/${encodeURIComponent("reader & west/1")}`,
    );
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect((await within(breadcrumb).findByRole("link", { name: "Dev" })).getAttribute("href")).toBe("/clusters/dev");
    expect(within(breadcrumb).getByRole("link", { name: "Consumer groups" }).getAttribute("href")).toBe("/clusters/dev/consumer-groups");
    expect(within(breadcrumb).getByText("reader & west/1")).toBeDefined();
  });

  it("names the Metrics page in the breadcrumb", async () => {
    renderWithQuery(
      <AppShell loadGatewayConfig={async () => [gateway]} credentials={credentials} connectionOpen={false}
        onOpenConnection={() => undefined} onOpenGatewayConnection={() => undefined} onCloseConnection={() => undefined}>
        <p>Page content</p>
      </AppShell>,
      "/clusters/dev/metrics",
    );
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect((await within(breadcrumb).findByRole("link", { name: "Dev" })).getAttribute("href")).toBe("/clusters/dev");
    expect(within(breadcrumb).getByText("Metrics")).toBeDefined();
  });
});
