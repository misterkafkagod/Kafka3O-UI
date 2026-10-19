import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClusterInfo } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterCard } from "./ClusterCard";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const broker = (id: number) => ({ id, host: `kafka-${id}`, port: 9092 });
const clusterWith = (brokerCount: number): ClusterInfo => ({
  clusterId: "abc",
  controllerId: 1,
  brokers: Array.from({ length: brokerCount }, (_, i) => broker(i + 1)),
});

describe("ClusterCard", () => {
  it("shows the gateway name and URL as text", () => {
    renderWithQuery(<ClusterCard gateway={gateway} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Dev" })).toBeDefined();
    expect(screen.getByText("http://localhost:8081")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows Checking… while the status loads", () => {
    renderWithQuery(<ClusterCard gateway={gateway} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByText("Checking…")).toBeDefined();
  });

  it("shows Healthy, the cluster ID and the broker count", async () => {
    renderWithQuery(<ClusterCard gateway={gateway} getCluster={async () => clusterWith(3)} />);

    expect(await screen.findByText("Healthy")).toBeDefined();
    expect(screen.getByText("Cluster ID: abc")).toBeDefined();
    expect(screen.getByText("3 brokers")).toBeDefined();
  });

  it("uses the singular for one broker", async () => {
    renderWithQuery(<ClusterCard gateway={gateway} getCluster={async () => clusterWith(1)} />);

    expect(await screen.findByText("1 broker")).toBeDefined();
  });

  it("shows Status unavailable when the status cannot be read", async () => {
    renderWithQuery(
      <ClusterCard
        gateway={gateway}
        getCluster={async () => {
          throw new Error("down");
        }}
      />,
    );

    expect(await screen.findByText("Status unavailable")).toBeDefined();
  });
});
