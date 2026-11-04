import { render, screen, within } from "@testing-library/react";
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
  it("renders message metadata, base64 fields, headers, and empty values", () => {
    render(<MessageTable messages={messages} />);

    const table = within(screen.getByRole("table", { name: "Topic messages" }));
    const rows = table.getAllByRole("row");
    expect(rows[0].textContent).toContain("Value (base64)");
    expect(within(rows[1]).getByText("2")).toBeDefined();
    expect(within(rows[1]).getByText("8")).toBeDefined();
    expect(within(rows[1]).getByText("b3JkZXItMQ==")).toBeDefined();
    expect(within(rows[1]).getByText("Y3JlYXRlZA==")).toBeDefined();
    expect(within(rows[1]).getByText("source: YXBp")).toBeDefined();
    expect(rows[1].querySelector("time")?.getAttribute("datetime")).toBe("2026-01-02T03:04:05Z");
    expect(within(rows[2]).getAllByText("(empty)")).toHaveLength(2);
    expect(within(rows[2]).getByText("(none)")).toBeDefined();
  });
});
