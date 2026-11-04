import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import type { SearchTopicMessages } from "./gateway/searchTopicMessages";

const { renderApp, listMessages, searchMessages } = vi.hoisted(() => ({
  renderApp: vi.fn<(element: unknown) => void>(),
  listMessages: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
  searchMessages: vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ messages: [], scanned: 0, truncated: false }),
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

type AppTree = ReactElement<{
  children: ReactElement<{
    children: ReactElement<{
      listLatestTopicMessages: ListLatestTopicMessages;
      searchTopicMessages: SearchTopicMessages;
      linkOrigin: string;
      copyMessageLink: (text: string) => Promise<void>;
    }>;
  }>;
}>;

afterEach(() => {
  document.body.innerHTML = "";
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

    await listLatestTopicMessages("http://gateway", "orders", offset);
    await listLatestTopicMessages("http://gateway", "orders", timestamp);

    expect(listMessages).toHaveBeenNthCalledWith(1, expect.any(Function), "http://gateway", "orders", offset);
    expect(listMessages).toHaveBeenNthCalledWith(2, expect.any(Function), "http://gateway", "orders", timestamp);
    await tree.props.children.props.children.props.searchTopicMessages("http://gateway", "orders", "needle");
    expect(searchMessages).toHaveBeenCalledWith(expect.any(Function), "http://gateway", "orders", "needle");
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(tree.props.children.props.children.props.linkOrigin).toBe(window.location.origin);
    await tree.props.children.props.children.props.copyMessageLink("https://console.example/message");
    expect(writeText).toHaveBeenCalledWith("https://console.example/message");
  });
});
