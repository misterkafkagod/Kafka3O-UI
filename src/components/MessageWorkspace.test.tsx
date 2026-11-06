import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { MessageWorkspace } from "./MessageWorkspace";

const messages: TopicMessage[] = [
  {
    partition: 2,
    offset: 8,
    timestamp: "2026-01-02T03:04:05Z",
    key: "b3JkZXItMQ==",
    value: "Y3JlYXRlZA==",
    headers: [{ key: "source", value: "YXBp" }],
  },
  { partition: 0, offset: 3, timestamp: "2026-01-02T03:00:00Z", key: "", value: "", headers: [] },
];

describe("MessageWorkspace", () => {
  it("distinguishes a verified linked record from an ordinary selected record", () => {
    const page = render(<MessageWorkspace messages={[messages[0]]} verifiedLink />);

    expect(screen.getByRole("region", { name: "Verified linked message" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Selected message" })).toBeNull();
    page.rerender(<MessageWorkspace messages={[messages[0]]} />);
    expect(screen.getByRole("region", { name: "Selected message" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Verified linked message" })).toBeNull();
  });

  it("initially inspects only the first record and lets the keyboard select another", async () => {
    const user = userEvent.setup();
    render(<MessageWorkspace messages={messages} />);

    const results = within(screen.getByRole("region", { name: "Message results" }));
    const inspectorElement = screen.getByRole("region", { name: "Selected message" });
    const inspector = within(inspectorElement);
    const first = results.getByRole("button", { name: "Inspect record 1, partition 2, offset 8" });
    const second = results.getByRole("button", { name: "Inspect record 2, partition 0, offset 3" });
    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(second.getAttribute("aria-pressed")).toBe("false");
    expect(first.getAttribute("aria-controls")).toBe(inspectorElement.id);
    expect(inspector.getByText("2")).toBeDefined();
    expect(inspector.getByText("8")).toBeDefined();
    expect(inspector.getByText("b3JkZXItMQ==")).toBeDefined();
    expect(inspector.getByText("created")).toBeDefined();
    expect(inspector.getByText("source: YXBp")).toBeDefined();
    expect(inspectorElement.querySelector("time")?.getAttribute("datetime")).toBe("2026-01-02T03:04:05Z");
    expect(inspector.queryByText("(empty)")).toBeNull();

    second.focus();
    await user.keyboard("{Enter}");
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(document.activeElement).toBe(second);
    expect(inspector.getAllByText("(empty)")).toHaveLength(2);
    expect(inspector.getByText("(none)")).toBeDefined();
    expect(inspector.queryByText("created")).toBeNull();
  });

  it("resets selection when results change, even if an earlier result set returns", async () => {
    const user = userEvent.setup();
    const page = render(<MessageWorkspace messages={messages} />);
    await user.click(screen.getByRole("button", { name: "Inspect record 2, partition 0, offset 3" }));
    expect(within(screen.getByRole("region", { name: "Selected message" })).getAllByText("(empty)")).toHaveLength(2);

    const replacement = [{ ...messages[0], offset: 12, value: "bmV3" }];
    page.rerender(<MessageWorkspace messages={replacement} />);
    expect(within(screen.getByRole("region", { name: "Selected message" })).getByText("new")).toBeDefined();
    expect(screen.queryByText("created")).toBeNull();

    page.rerender(<MessageWorkspace messages={messages} />);
    expect(screen.getByRole("button", { name: "Inspect record 1, partition 2, offset 8" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(screen.getByRole("region", { name: "Selected message" })).getByText("created")).toBeDefined();
  });

  it("distinguishes records with unavailable legacy offsets without guessing their identity", async () => {
    const user = userEvent.setup();
    const unsafe = Number("9007199254740993");
    render(<MessageWorkspace messages={[
      { ...messages[0], partition: 1, offset: unsafe, value: "Zmlyc3Q=" },
      { ...messages[0], partition: 1, offset: unsafe, value: "c2Vjb25k" },
    ]} />);

    expect(within(screen.getByRole("region", { name: "Selected message" })).getByText("first")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Inspect record 2, partition 1, offset unavailable" }));
    const inspector = within(screen.getByRole("region", { name: "Selected message" }));
    expect(inspector.getByText("second")).toBeDefined();
    expect(inspector.getByText("Exact offset unavailable")).toBeDefined();
    expect(inspector.queryByText("first")).toBeNull();
  });

  it("switches values between formatted JSON, text and base64", async () => {
    const user = userEvent.setup();
    render(<MessageWorkspace messages={[{ ...messages[0], value: "eyJvayI6dHJ1ZX0=" }]} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "json");
    expect(screen.getByRole("region", { name: "Message value" }).textContent).toContain('{\n  "ok": true\n}');
    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "base64");
    expect(screen.getByText("eyJvayI6dHJ1ZX0=")).toBeDefined();
  });

  it("identifies invalid JSON while keeping decoded text and base64 selectable", async () => {
    const user = userEvent.setup();
    render(<MessageWorkspace messages={[{ ...messages[0], value: "bm90IGpzb24=" }]} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "json");
    expect(screen.getByRole("status").textContent).toBe("Invalid JSON");
    expect(screen.getByText("not json")).toBeDefined();
    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "base64");
    expect(screen.getByText("bm90IGpzb24=")).toBeDefined();
  });

  it("preserves null keys, tombstone values and null header values", async () => {
    const user = userEvent.setup();
    render(<MessageWorkspace messages={[{ ...messages[0], key: null, value: null, headers: [{ key: "source", value: null }] }]} />);

    expect(screen.getAllByText("(null)")).toHaveLength(2);
    expect(screen.getByText("source: (null)")).toBeDefined();
    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "json");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByText("(null)")).toHaveLength(2);
  });

  it("copies a precise message link and reports clipboard success", async () => {
    const user = userEvent.setup();
    const copyText = vi.fn(async () => {});
    render(
      <MessageWorkspace
        messages={[{ ...messages[0], offset: Number("9007199254740993"), offsetExact: "9007199254740993" }]}
        messageLinks={{ origin: "https://console.example", gatewayId: "dev", topicName: "orders & audit", copyText }}
      />,
    );

    expect(screen.getByText("9007199254740993")).toBeDefined();
    const expected = "https://console.example/clusters/dev/topics/orders%20%26%20audit/messages?partition=2&offset=9007199254740993";
    expect(screen.getByRole("link", { name: "Message link" }).getAttribute("href")).toBe(expected);
    await user.click(screen.getByRole("button", { name: "Copy link for partition 2 offset 9007199254740993" }));
    expect(copyText).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("status").textContent).toBe("Message link copied.");
  });

  it("clears the previous copy status and link when a different record is selected", async () => {
    const user = userEvent.setup();
    const copyText = vi.fn(async () => {});
    render(<MessageWorkspace messages={messages} messageLinks={{ origin: "https://console.example", gatewayId: "dev", topicName: "orders", copyText }} />);

    await user.click(screen.getByRole("button", { name: "Copy link for partition 2 offset 8" }));
    expect(screen.getByText("Message link copied.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Inspect record 2, partition 0, offset 3" }));
    expect(screen.queryByText("Message link copied.")).toBeNull();
    expect(screen.getByRole("link", { name: "Message link" }).getAttribute("href")).toContain("partition=0&offset=3");
  });

  it("reports clipboard failure and preserves a usable link", async () => {
    const user = userEvent.setup();
    render(
      <MessageWorkspace
        messages={[messages[0]]}
        messageLinks={{ origin: "https://console.example", gatewayId: "dev", topicName: "orders", copyText: async () => { throw new Error("denied"); } }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy link for partition 2 offset 8" }));
    expect(screen.getByRole("alert").textContent).toContain("Copy failed");
    expect(screen.getByRole("link", { name: "Message link" })).toBeDefined();
  });

  it("does not create a misleading link for an unsafe legacy offset", () => {
    render(
      <MessageWorkspace
        messages={[{ ...messages[0], offset: Number("9007199254740993") }]}
        messageLinks={{ origin: "https://console.example", gatewayId: "dev", topicName: "orders", copyText: async () => {} }}
      />,
    );

    expect(screen.getByText("Exact offset unavailable")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("exact message position is unavailable");
    expect(screen.queryByRole("link", { name: "Message link" })).toBeNull();
  });

  it("reports an empty result without creating an inspector", () => {
    render(<MessageWorkspace messages={[]} />);

    expect(screen.getByText("No messages found.")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Selected message" })).toBeNull();
  });
});
