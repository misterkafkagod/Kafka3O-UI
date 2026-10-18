import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoGatewaysConfigured } from "./NoGatewaysConfigured";

describe("NoGatewaysConfigured", () => {
  it("shows the message and a config.json example", () => {
    render(<NoGatewaysConfigured />);

    expect(screen.getByRole("heading", { name: "No gateways configured" })).toBeDefined();
    expect(screen.getByText(/"gateways":\[\{"id":"dev"/)).toBeDefined();
  });
});
