import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterDetails } from "./ClusterDetails";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };

describe("ClusterDetails", () => {
  it("shows Checking… while the cluster loads", () => {
    renderWithQuery(<ClusterDetails gateway={gateway} statusRefreshMs={60_000} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Dev" })).toBeDefined();
    expect(screen.getByText("Checking…")).toBeDefined();
  });

  it("shows the cluster ID, controller and broker table", async () => {
    renderWithQuery(
      <ClusterDetails
        gateway={gateway}
        statusRefreshMs={60_000}
        getCluster={async () => ({ clusterId: "abc", controllerId: 2, brokers: [{ id: 2, host: "kafka-2", port: 9092 }] })}
      />,
    );

    expect(await screen.findByText("Cluster ID: abc")).toBeDefined();
    expect(screen.getByText("Controller: 2")).toBeDefined();
    expect(screen.getByRole("table", { name: "Brokers" })).toBeDefined();
  });
});
