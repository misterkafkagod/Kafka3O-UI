import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { GatewayCredentials } from "./gateway/GatewayCredentials";
import type { GetCluster } from "./gateway/getCluster";
import type { ListConsumerGroups } from "./gateway/listConsumerGroups";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";
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
      linkOrigin: string;
      copyMessageLink: (text: string) => Promise<void>;
    }>;
  }>;
}>;

afterEach(() => {
  document.body.innerHTML = "";
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
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
    const fetchFn = vi.fn<typeof fetch>(async (url) => {
      if (url === "/config.json") return Response.json({ gateways: [{ id: "dev", name: "Dev", url: "https://gateway" }] });
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
    props.gatewayCredentials.clear("https://gateway");
    expect(props.gatewayCredentials.read("https://gateway")).toBeNull();
  });
});
