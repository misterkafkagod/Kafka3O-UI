import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SettingInfo } from "./SettingInfo";

describe("SettingInfo", () => {
  it("opens the documentation in a dialog from the information icon and closes it", async () => {
    const user = userEvent.setup();
    render(<SettingInfo name="retention.ms" documentation="How long to keep log segments." />);
    expect(screen.queryByText("How long to keep log segments.")?.closest("dialog")?.open).toBe(false);

    await user.click(screen.getByRole("button", { name: "About retention.ms" }));
    const dialog = screen.getByRole("dialog", { name: "retention.ms" }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain("How long to keep log segments.");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog.open).toBe(false);
  });
});
