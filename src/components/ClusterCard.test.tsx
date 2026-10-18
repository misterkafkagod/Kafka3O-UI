import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClusterCard } from "./ClusterCard";

describe("ClusterCard", () => {
  it("shows the gateway name and URL as text", () => {
    render(<ClusterCard gateway={{ id: "dev", name: "Dev", url: "http://localhost:8081" }} />);

    expect(screen.getByRole("heading", { name: "Dev" })).toBeDefined();
    expect(screen.getByText("http://localhost:8081")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
