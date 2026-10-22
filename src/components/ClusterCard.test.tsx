import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HttpError } from "../gateway/HttpError";
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
    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={60_000} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Dev" })).toBeDefined();
    expect(screen.getByText("http://localhost:8081")).toBeDefined();
    expect(screen.queryByRole("link", { name: "http://localhost:8081" })).toBeNull();
  });

  it("links the name to /clusters/dev", () => {
    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={60_000} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByRole("link", { name: "Dev" }).getAttribute("href")).toBe("/clusters/dev");
  });

  it("shows Checking… while the status loads", () => {
    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={60_000} getCluster={() => new Promise(() => {})} />);

    expect(screen.getByText("Checking…")).toBeDefined();
  });

  it("shows Healthy, the cluster ID and the broker count", async () => {
    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={60_000} getCluster={async () => clusterWith(3)} />);

    expect(await screen.findByText("Healthy")).toBeDefined();
    expect(screen.getByText("Cluster ID: abc")).toBeDefined();
    expect(screen.getByText("3 brokers")).toBeDefined();
  });

  it("uses the singular for one broker", async () => {
    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={60_000} getCluster={async () => clusterWith(1)} />);

    expect(await screen.findByText("1 broker")).toBeDefined();
  });

  it("shows Gateway unreachable when the gateway cannot be reached", async () => {
    renderWithQuery(
      <ClusterCard
        gateway={gateway} statusRefreshMs={60_000}
        getCluster={async () => {
          throw new TypeError("Failed to fetch");
        }}
      />,
    );

    expect(await screen.findByText("Gateway unreachable")).toBeDefined();
  });

  it("shows Cluster unreachable with the gateway's message", async () => {
    renderWithQuery(
      <ClusterCard
        gateway={gateway} statusRefreshMs={60_000}
        getCluster={async () => {
          throw new HttpError(503, "GET failed with 503", {
            code: "cluster_unreachable",
            detail: "Kafka is unreachable: dial tcp: connection refused",
          });
        }}
      />,
    );

    expect(await screen.findByText("Cluster unreachable")).toBeDefined();
    expect(screen.getByText("Kafka is unreachable: dial tcp: connection refused")).toBeDefined();
  });

  it("error wins over stale data", async () => {
    let calls = 0;
    const getCluster = async () => {
      calls += 1;
      if (calls === 1) {
        return clusterWith(1);
      }
      throw new TypeError("Failed to fetch");
    };

    renderWithQuery(<ClusterCard gateway={gateway} statusRefreshMs={20} getCluster={getCluster} />);

    expect(await screen.findByText("Healthy")).toBeDefined();
    expect(await screen.findByText("Gateway unreachable")).toBeDefined();
    expect(screen.queryByText("Healthy")).toBeNull();
  });

  it("shows Status unavailable when the status cannot be read", async () => {
    renderWithQuery(
      <ClusterCard
        gateway={gateway} statusRefreshMs={60_000}
        getCluster={async () => {
          throw new Error("down");
        }}
      />,
    );

    expect(await screen.findByText("Status unavailable")).toBeDefined();
  });
});
