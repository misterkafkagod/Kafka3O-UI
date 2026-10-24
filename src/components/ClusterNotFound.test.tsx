import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterNotFound } from "./ClusterNotFound";

describe("ClusterNotFound", () => {
  it("shows the heading, the unknown ID and a link to /", () => {
    renderWithQuery(<ClusterNotFound gatewayId="unknown" />);

    expect(screen.getByRole("heading", { name: "Cluster not found" })).toBeDefined();
    expect(screen.getByText('No gateway with ID "unknown" is configured.')).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to all clusters" }).getAttribute("href")).toBe("/");
  });
});
