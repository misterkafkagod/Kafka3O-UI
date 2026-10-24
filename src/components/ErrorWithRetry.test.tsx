import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import { ErrorWithRetry } from "./ErrorWithRetry";

describe("ErrorWithRetry", () => {
  it("shows Gateway unreachable for a network failure", () => {
    render(<ErrorWithRetry error={new TypeError("Failed to fetch")} onRetry={() => {}} />);

    expect(within(screen.getByRole("alert")).getByText("Gateway unreachable")).toBeDefined();
  });

  it("shows Cluster unreachable with the problem detail", () => {
    const error = new HttpError(503, "GET failed with 503", { code: "cluster_unreachable", detail: "dial tcp: refused" });

    render(<ErrorWithRetry error={error} onRetry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Cluster unreachable")).toBeDefined();
    expect(within(alert).getByText("dial tcp: refused")).toBeDefined();
  });

  it("shows Something went wrong with the error message", () => {
    render(<ErrorWithRetry error={new Error("boom")} onRetry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Something went wrong")).toBeDefined();
    expect(within(alert).getByText("boom")).toBeDefined();
  });

  it("Retry calls onRetry once", async () => {
    const onRetry = vi.fn();
    render(<ErrorWithRetry error={new TypeError("Failed to fetch")} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
