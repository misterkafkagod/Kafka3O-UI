import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageInspector } from "./MessageInspector";

describe("MessageInspector", () => {
  it("labels the selected record and displays its exact position and timestamp", () => {
    render(<MessageInspector id="inspector" message={{
      partition: 1,
      offset: 7,
      timestamp: "2026-01-02T03:04:05Z",
      key: "",
      value: "",
      headers: [],
    }} />);

    const inspector = screen.getByRole("region", { name: "Selected message" });
    expect(inspector.id).toBe("inspector");
    expect(within(inspector).getByText("Partition").nextElementSibling?.textContent).toBe("1");
    expect(within(inspector).getByText("Offset").nextElementSibling?.textContent).toBe("7");
    expect(inspector.querySelector("time")?.getAttribute("datetime")).toBe("2026-01-02T03:04:05Z");
  });
});
