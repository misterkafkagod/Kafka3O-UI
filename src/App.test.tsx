import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the Kafka3O header", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Kafka3O" })).toBeDefined();
  });
});
