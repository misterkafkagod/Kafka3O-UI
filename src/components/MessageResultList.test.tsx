import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { MessageResultList } from "./MessageResultList";

describe("MessageResultList", () => {
  it("keeps result order and identifies the selected record and inspector", async () => {
    const messages: TopicMessage[] = [
      { partition: 1, offset: 9, timestamp: "2026-01-02T03:04:05Z", key: null, value: null, headers: [] },
      { partition: 0, offset: 3, timestamp: "2026-01-02T03:04:06Z", key: null, value: null, headers: [] },
    ];
    const onSelect = vi.fn();
    render(<MessageResultList messages={messages} selectedIndex={0} inspectorId="inspector" onSelect={onSelect} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Inspect record 1, partition 1, offset 9",
      "Inspect record 2, partition 0, offset 3",
    ]);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1].getAttribute("aria-controls")).toBe("inspector");
    await userEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith(messages[1]);
  });
});
