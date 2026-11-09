import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { ConfigurationResource, KafkaAdministration } from "./gateway/administration";

describe("Kafka administration navigation", () => {
  it("opens per-broker settings and topic configuration with partition controls", async () => {
    const user = userEvent.setup();
    const getConfigurations = vi.fn(async (_url: string, resource: ConfigurationResource) => [{
      name: resource.kind === "broker" ? `broker.setting.${resource.id}` : "retention.ms",
      value: "60000", sensitive: false, readOnly: false, source: "DEFAULT_CONFIG", type: "LONG",
    }]);
    const listReassignments = vi.fn(async () => []);
    const admin: KafkaAdministration = {
      getConfigurations,
      alterConfiguration: async () => {},
      increasePartitions: async () => {},
      listReassignments,
      reassignPartition: async () => {},
      confirmChange: () => false,
    };
    const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };
    render(
      <MemoryRouter initialEntries={["/clusters/dev/brokers"]}>
        <App
          queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          loadGatewayConfig={async () => [gateway]}
          gatewayCredentials={{ read: () => null, save: () => {}, clear: () => {} }}
          administration={admin}
          getCluster={async () => ({ clusterId: "cluster", controllerId: 1, brokers: [
            { id: 1, host: "broker-1", port: 9092 }, { id: 2, host: "broker-2", port: 9092 },
          ] })}
          listTopics={async () => [{ name: "orders", partitions: 1, replicationFactor: 2, internal: false, approxMessages: 0 }]}
          listConsumerGroups={async () => []}
          getTopicDetail={async () => ({ name: "orders", partitions: [
            { id: 0, leader: 1, replicas: [1, 2], isr: [1, 2], startOffset: 0, endOffset: 0 },
          ], config: [] })}
          listLatestTopicMessages={async () => []}
          searchTopicMessages={async () => ({ messages: [], scanned: 0, truncated: false })}
          produceTopicMessage={async () => ({ partition: 0, offset: "0" })}
          createTopic={async () => {}}
          deleteTopic={async () => {}}
          confirmTopicDeletion={() => false}
          linkOrigin="https://console.example"
          copyMessageLink={async () => {}}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("link", { name: "Broker configuration" }));
    expect(await screen.findByText("broker.setting.1")).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Broker"), "2");
    expect(await screen.findByText("broker.setting.2")).toBeDefined();
    expect(getConfigurations).toHaveBeenLastCalledWith(gateway.url, { kind: "broker", id: 2 });
    await user.click(screen.getByRole("link", { name: "Topics" }));
    await user.click(await screen.findByRole("link", { name: "orders" }));
    await user.click(await screen.findByRole("link", { name: "Configuration & partitions" }));
    expect(await screen.findByText("retention.ms")).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Partitions and replica placement" })).toBeDefined();
    await waitFor(() => expect(listReassignments).toHaveBeenCalledWith(gateway.url, "orders"));
    expect(screen.getByRole("link", { name: "Configuration & partitions" }).getAttribute("aria-current")).toBe("page");
  });
});
