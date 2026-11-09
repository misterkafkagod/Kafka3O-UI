import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionIndicator } from "./SessionIndicator";

describe("SessionIndicator", () => {
  it("names the signed-in user and signs out on request", async () => {
    const onSignOut = vi.fn();
    render(<SessionIndicator username="admin" signingOut={false} onSignOut={onSignOut} />);

    const group = screen.getByRole("group", { name: "Console session" });
    expect(group.textContent).toContain("Signed in as admin");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("disables sign-out while it is pending", () => {
    render(<SessionIndicator username="admin" signingOut onSignOut={() => undefined} />);

    expect((screen.getByRole("button", { name: "Signing out..." }) as HTMLButtonElement).disabled).toBe(true);
  });
});
