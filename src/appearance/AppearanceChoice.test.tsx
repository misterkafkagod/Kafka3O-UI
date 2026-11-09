import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppearanceChoice } from "./AppearanceChoice";

describe("AppearanceChoice", () => {
  it("renders a labeled radio group and reports the chosen option", async () => {
    const onChange = vi.fn();
    render(<AppearanceChoice legend="Size" name="size" options={["s", "l"] as const} labels={{ s: "Small", l: "Large" }} value="s" onChange={onChange} />);

    expect(screen.getByRole("group", { name: "Size" })).toBeDefined();
    expect((screen.getByRole("radio", { name: "Small" }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByRole("radio", { name: "Large" }));
    expect(onChange).toHaveBeenCalledWith("l");
  });
});
