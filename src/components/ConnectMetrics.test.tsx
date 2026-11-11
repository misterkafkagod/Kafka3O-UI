import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectMetrics } from "./ConnectMetrics";

describe("ConnectMetrics", () => {
  it("counts connectors and tasks by state and lists failures", () => {
    render(<ConnectMetrics connect={{ connectors: [{ state: "PAUSED", count: 1 }, { state: "RUNNING", count: 4 }], tasks: [{ state: "FAILED", count: 1 }, { state: "RUNNING", count: 4 }],
      failures: [{ connector: "kafka3o-verify-failing", task: 0, error: "ConnectException: no such file" }, { connector: "broken", task: null, error: "" }] }} />);
    expect(within(screen.getByLabelText("Connectors")).getByText("Connectors running").nextElementSibling?.textContent).toBe("4");
    expect(within(screen.getByLabelText("Tasks")).getByText("Tasks failed").nextElementSibling?.textContent).toBe("1");
    expect(within(screen.getByRole("list", { name: "Kafka Connect failures" })).getAllByRole("listitem").map((item) => item.textContent))
      .toEqual(["kafka3o-verify-failing task 0: ConnectException: no such file", "broken: failed"]);
  });

  it("says when Connect is not configured or unreachable", () => {
    const { unmount } = render(<ConnectMetrics connect={{ notConfigured: true, connectors: [], tasks: [], failures: [] }} />);
    expect(screen.getByRole("status").textContent).toBe("Kafka Connect is not configured for this cluster.");
    unmount();
    render(<ConnectMetrics connect={{ error: "kafka connect is unreachable", connectors: [], tasks: [], failures: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: kafka connect is unreachable");
  });
});
