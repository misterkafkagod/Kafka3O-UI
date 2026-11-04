import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";

const { renderApp, listMessages } = vi.hoisted(() => ({
  renderApp: vi.fn<(element: unknown) => void>(),
  listMessages: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
}));

vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: renderApp }),
}));

vi.mock("./gateway/listLatestTopicMessages", () => ({
  listLatestTopicMessages: listMessages,
}));

type AppTree = ReactElement<{
  children: ReactElement<{
    children: ReactElement<{ listLatestTopicMessages: ListLatestTopicMessages }>;
  }>;
}>;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("main composition", () => {
  it("forwards offset and timestamp positions to the message request", async () => {
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
  });
});
