import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { ConsoleSessionClient } from "./console/ConsoleSession";
import type { GatewayCredentials } from "./gateway/GatewayCredentials";
import type { GetCluster } from "./gateway/getCluster";
import type { CreateTopic } from "./gateway/createTopic";
import type { ConfirmTopicDeletion, DeleteTopic } from "./gateway/deleteTopic";
import type { ListConsumerGroups } from "./gateway/listConsumerGroups";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import type { ProduceTopicMessage } from "./gateway/produceTopicMessage";
import type { SearchTopicMessages } from "./gateway/searchTopicMessages";

const { renderApp, listMessages, searchMessages, listGroups } = vi.hoisted(() => ({
  renderApp: vi.fn<(element: unknown) => void>(),
  listMessages: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
  searchMessages: vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ messages: [], scanned: 0, truncated: false }),
  listGroups: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
}));

vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: renderApp }),
}));

vi.mock("./gateway/listLatestTopicMessages", () => ({
  listLatestTopicMessages: listMessages,
}));

vi.mock("./gateway/searchTopicMessages", () => ({
  searchTopicMessages: searchMessages,
}));

vi.mock("./gateway/listConsumerGroups", () => ({
  listConsumerGroups: listGroups,
}));

type AppTree = ReactElement<{
  children: ReactElement<{
    children: ReactElement<{
      listLatestTopicMessages: ListLatestTopicMessages;
      searchTopicMessages: SearchTopicMessages;
      listConsumerGroups: ListConsumerGroups;
      getCluster: GetCluster;
      loadGatewayConfig: LoadGatewayConfig;
      gatewayCredentials: GatewayCredentials;
      produceTopicMessage: ProduceTopicMessage;
      createTopic: CreateTopic;
      deleteTopic: DeleteTopic;
      confirmTopicDeletion: ConfirmTopicDeletion;
      linkOrigin: string;
      copyMessageLink: (text: string) => Promise<void>;
    }>;
  }>;
}>;

afterEach(() => {
  document.body.innerHTML = "";
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  renderApp.mockClear();
});

describe("main composition", () => {
  it("forwards positioned reads and message searches", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("./main");

    const tree = renderApp.mock.calls[0][0] as AppTree;
    const listLatestTopicMessages = tree.props.children.props.children.props.listLatestTopicMessages;
    const offset = { partition: 2, offset: 17 };
    const timestamp = { partition: 1, timestamp: 1700000000123 };

    await listLatestTopicMessages("https://gateway", "orders", offset);
    await listLatestTopicMessages("https://gateway", "orders", timestamp);

    expect(listMessages).toHaveBeenNthCalledWith(1, expect.any(Function), "https://gateway", "orders", offset);
    expect(listMessages).toHaveBeenNthCalledWith(2, expect.any(Function), "https://gateway", "orders", timestamp);
    await tree.props.children.props.children.props.searchTopicMessages("https://gateway", "orders", "needle");
    expect(searchMessages).toHaveBeenCalledWith(expect.any(Function), "https://gateway", "orders", "needle");
    await tree.props.children.props.children.props.listConsumerGroups("https://gateway");
    expect(listGroups).toHaveBeenCalledWith(expect.any(Function), "https://gateway");
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(tree.props.children.props.children.props.linkOrigin).toBe(window.location.origin);
    await tree.props.children.props.children.props.copyMessageLink("https://console.example/message");
    expect(writeText).toHaveBeenCalledWith("https://console.example/message");

    vi.stubGlobal("isSecureContext", true);
    const fetchFn = vi.fn<typeof fetch>(async (url, init) => {
      if (url === "/config.json") return Response.json({ gateways: [{ id: "dev", name: "Dev", url: "https://gateway" }] });
      if (init?.method === "POST" && typeof url === "string" && url.endsWith("/api/v1/topics")) {
        return Response.json(JSON.parse(String(init.body)), { status: 201 });
      }
      if (init?.method === "POST") return Response.json({ partition: 1, offset: "9007199254740993" });
      if (init?.method === "DELETE") return Response.json({ name: "orders", status: "accepted" }, { status: 202 });
      return Response.json({ clusterId: "abc", controllerId: 1, brokers: [] });
    });
    vi.stubGlobal("fetch", fetchFn);
    const props = tree.props.children.props.children.props;
    const token = "a".repeat(32);
    props.gatewayCredentials.save("https://gateway", token);
    expect(props.gatewayCredentials.read("https://gateway")).toBe(token);
    await props.loadGatewayConfig();
    expect(new Headers(fetchFn.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
    await props.getCluster("https://gateway");
    expect(new Headers(fetchFn.mock.calls[1][1]?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    expect(fetchFn.mock.calls[1][1]?.redirect).toBe("error");
    await props.getCluster("https://another-gateway");
    expect(new Headers(fetchFn.mock.calls[2][1]?.headers).has("Authorization")).toBe(false);
    const messageFetch = listMessages.mock.calls[0][0] as (url: string) => Promise<unknown>;
    await messageFetch("https://gateway/api/v1/topics/orders/messages");
    expect(new Headers(fetchFn.mock.calls[3][1]?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    await expect(messageFetch("https://another-gateway/api/v1/topics")).rejects.toThrow(/outside/);
    await expect(props.produceTopicMessage("https://gateway", "orders", { value: "", headers: [] }))
      .resolves.toEqual({ partition: 1, offset: "9007199254740993" });
    expect(fetchFn.mock.calls[4][1]?.method).toBe("POST");
    expect(new Headers(fetchFn.mock.calls[4][1]?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    await props.createTopic("https://gateway", { name: "orders", partitions: 1, replicationFactor: 1 });
    expect(fetchFn.mock.calls[5][1]?.method).toBe("POST");
    expect(new Headers(fetchFn.mock.calls[5][1]?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    expect(props.confirmTopicDeletion("orders")).toBe(false);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("permanently deleted"));
    await props.deleteTopic("https://gateway", "orders");
    expect(fetchFn.mock.calls[6][1]?.method).toBe("DELETE");
    expect(new Headers(fetchFn.mock.calls[6][1]?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    props.gatewayCredentials.clear("https://gateway");
    expect(props.gatewayCredentials.read("https://gateway")).toBeNull();
  });

  it("renders only the authentication preview even when the manual proxy is enabled", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.stubEnv("VITE_KAFKA3O_CONSOLE_AUTH_PREVIEW", "true");
    vi.stubEnv("VITE_KAFKA3O_MANUAL_PROXY", "true");
    const fetchFn = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchFn);
    await import("./main");
    const tree = renderApp.mock.calls[0][0] as ReactElement<{ children: ReactElement<{ client: ConsoleSessionClient }> }>;
    const { ConsoleSessionGate } = await import("./components/ConsoleSessionGate");
    expect(tree.props.children.type).toBe(ConsoleSessionGate);
    await expect(tree.props.children.props.client.inspect()).rejects.toMatchObject({ code: "insecure_origin" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
