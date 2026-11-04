import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { MessageTable } from "./MessageTable";

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

describe("MessageTable", () => {
  it("renders message metadata, text values, headers, and empty values", () => {
    render(<MessageTable messages={messages} />);

    const table = within(screen.getByRole("table", { name: "Topic messages" }));
    const rows = table.getAllByRole("row");
    expect(rows[0].textContent).toContain("Value");
    expect(within(rows[1]).getByText("2")).toBeDefined();
    expect(within(rows[1]).getByText("8")).toBeDefined();
    expect(within(rows[1]).getByText("b3JkZXItMQ==")).toBeDefined();
    expect(within(rows[1]).getByText("created")).toBeDefined();
    expect(within(rows[1]).getByText("source: YXBp")).toBeDefined();
    expect(rows[1].querySelector("time")?.getAttribute("datetime")).toBe("2026-01-02T03:04:05Z");
    expect(within(rows[2]).getAllByText("(empty)")).toHaveLength(2);
    expect(within(rows[2]).getByText("(none)")).toBeDefined();
  });

  it("switches values between formatted JSON, text, and base64", async () => {
    const user = userEvent.setup();
    const jsonMessage = [{ ...messages[0], value: "eyJvayI6dHJ1ZX0=" }];
    render(<MessageTable messages={jsonMessage} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "json");
    expect(screen.getByRole("table", { name: "Topic messages" }).textContent).toContain('{\n  "ok": true\n}');

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "base64");
    expect(screen.getByText("eyJvayI6dHJ1ZX0=")).toBeDefined();
  });

  it("identifies invalid JSON while keeping decoded text and base64 selectable", async () => {
    const user = userEvent.setup();
    render(<MessageTable messages={[{ ...messages[0], value: "bm90IGpzb24=" }]} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "json");
    expect(screen.getByRole("status").textContent).toBe("Invalid JSON");
    expect(screen.getByText("not json")).toBeDefined();

    await user.selectOptions(screen.getByRole("combobox", { name: "Value format" }), "base64");
    expect(screen.getByText("bm90IGpzb24=")).toBeDefined();
  });
});
