import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterDetails } from "./ClusterDetails";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };

describe("ClusterDetails", () => {
  it("shows Checking… while the cluster loads", () => {
    renderWithQuery(<ClusterDetails gateway={gateway} statusRefreshMs={60_000} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Dev" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("Checking…");
  });

  it("shows the cluster ID, controller and broker table", async () => {
    renderWithQuery(
      <ClusterDetails
        gateway={gateway}
        statusRefreshMs={60_000}
        getCluster={async () => ({ clusterId: "abc", controllerId: 2, brokers: [{ id: 2, host: "kafka-2", port: 9092 }] })}
      />,
    );

    const summary = await screen.findByRole("region", { name: "Cluster summary" });
    expect(within(summary).getByText("Cluster ID").nextElementSibling?.textContent).toBe("abc");
    expect(within(summary).getByText("Controller").nextElementSibling?.textContent).toBe("2");
    expect(within(summary).getByText("Brokers").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByRole("table", { name: "Brokers" })).toBeDefined();
  });

  it("shows the error with Retry instead of the brokers when the request fails", async () => {
    renderWithQuery(
      <ClusterDetails
        gateway={gateway}
        statusRefreshMs={60_000}
        getCluster={async () => {
          throw new TypeError("Failed to fetch");
        }}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeDefined();
    expect(screen.queryByRole("table", { name: "Brokers" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Cluster summary" })).toBeNull();
  });

  it("replaces a successful summary with an error after a failed refresh", async () => {
    let failed = false;
    renderWithQuery(
      <ClusterDetails
        gateway={gateway}
        statusRefreshMs={20}
        getCluster={async () => {
          if (failed) throw new TypeError("Failed to fetch");
          return { clusterId: "abc", controllerId: 1, brokers: [{ id: 1, host: "kafka-1", port: 9092 }] };
        }}
      />,
    );

    expect(await screen.findByRole("region", { name: "Cluster summary" })).toBeDefined();
    failed = true;
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Cluster summary" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Brokers" })).toBeNull();
  });

  it("reports zero brokers only when the gateway returned an empty list", async () => {
    renderWithQuery(
      <ClusterDetails gateway={gateway} statusRefreshMs={60_000} getCluster={async () => ({ clusterId: "abc", controllerId: 1, brokers: [] })} />,
    );

    const summary = await screen.findByRole("region", { name: "Cluster summary" });
    expect(within(summary).getByText("Brokers").nextElementSibling?.textContent).toBe("0");
    expect(screen.getByText("No brokers reported.")).toBeDefined();
    expect(screen.getByRole("table", { name: "Brokers" })).toBeDefined();
  });
});
