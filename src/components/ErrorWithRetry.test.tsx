import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { GatewayConnectionContext } from "./GatewayConnectionContext";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };

describe("ErrorWithRetry", () => {
  it("shows Gateway unreachable for a network failure", () => {
    render(<ErrorWithRetry gateway={gateway} error={new TypeError("Failed to fetch")} onRetry={() => {}} />);

    expect(within(screen.getByRole("alert")).getByText("Gateway unreachable")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Manage credentials for Dev" })).toBeNull();
  });

  it("shows Cluster unreachable with the problem detail", () => {
    const error = new HttpError(503, "GET failed with 503", { code: "cluster_unreachable", detail: "dial tcp: refused" });

    render(<ErrorWithRetry gateway={gateway} error={error} onRetry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Cluster unreachable")).toBeDefined();
    expect(within(alert).getByText("dial tcp: refused")).toBeDefined();
  });

  it("shows Something went wrong with the error message", () => {
    render(<ErrorWithRetry gateway={gateway} error={new Error("boom")} onRetry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Something went wrong")).toBeDefined();
    expect(within(alert).getByText("boom")).toBeDefined();
  });

  it("Retry calls onRetry once", async () => {
    const onRetry = vi.fn();
    render(<ErrorWithRetry gateway={gateway} error={new TypeError("Failed to fetch")} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers the selected gateway's credential action for authentication failures", async () => {
    const openConnection = vi.fn();
    const onRetry = vi.fn();
    render(
      <GatewayConnectionContext.Provider value={openConnection}>
        <ErrorWithRetry gateway={gateway} error={new HttpError(401, "unauthorized")} onRetry={onRetry} />
      </GatewayConnectionContext.Provider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Manage credentials for Dev" }));
    expect(openConnection).toHaveBeenCalledWith("dev");
    expect(onRetry).not.toHaveBeenCalled();
  });
});
