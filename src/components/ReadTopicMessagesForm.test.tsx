import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReadTopicMessagesForm } from "./ReadTopicMessagesForm";

describe("ReadTopicMessagesForm", () => {
  it("submits a partition and offset", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    render(<ReadTopicMessagesForm onRead={onRead} onReadLatest={() => {}} />);
    await user.clear(screen.getByRole("spinbutton", { name: "Partition" }));
    await user.type(screen.getByRole("spinbutton", { name: "Partition" }), "2");
    await user.clear(screen.getByRole("spinbutton", { name: "Offset" }));
    await user.type(screen.getByRole("spinbutton", { name: "Offset" }), "17");
    await user.click(screen.getByRole("button", { name: "Read messages" }));

    expect(onRead).toHaveBeenCalledWith({ partition: 2, offset: 17 });
  });

  it("submits a partition and timestamp", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    render(<ReadTopicMessagesForm onRead={onRead} onReadLatest={() => {}} />);
    await user.click(screen.getByRole("radio", { name: "Timestamp" }));
    await user.clear(screen.getByRole("spinbutton", { name: "Partition" }));
    await user.type(screen.getByRole("spinbutton", { name: "Partition" }), "1");
    await user.clear(screen.getByRole("spinbutton", { name: "Timestamp (Unix milliseconds)" }));
    await user.type(screen.getByRole("spinbutton", { name: "Timestamp (Unix milliseconds)" }), "1700000000123");
    await user.click(screen.getByRole("button", { name: "Read messages" }));

    expect(onRead).toHaveBeenCalledWith({ partition: 1, timestamp: 1700000000123 });
  });

  it("returns to the latest-message query", async () => {
    const onReadLatest = vi.fn();
    render(<ReadTopicMessagesForm onRead={() => {}} onReadLatest={onReadLatest} />);

    await userEvent.click(screen.getByRole("button", { name: "Latest messages" }));

    expect(onReadLatest).toHaveBeenCalledTimes(1);
  });
});
