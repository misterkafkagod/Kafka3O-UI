import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TopicTable } from "./TopicTable";

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).getAllByRole("row").map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("TopicTable", () => {
  it("shows name, partitions, replication factor and the approximate count with ~", () => {
    render(
      <MemoryRouter>
        <TopicTable
          gatewayId="dev"
          topics={[{ name: "orders", partitions: 6, replicationFactor: 3, internal: false, approxMessages: 1000 }]}
        />
      </MemoryRouter>,
    );

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Name", "Partitions", "Replication", "Messages"]);
    expect(bodyRows()).toEqual([["orders", "6", "3", "~1000"]]);
  });

  it("keeps the given order", () => {
    render(
      <MemoryRouter>
        <TopicTable
          gatewayId="dev"
          topics={[
            { name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 0 },
            { name: "audit", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 0 },
          ]}
        />
      </MemoryRouter>,
    );

    expect(bodyRows().map((row) => row[0])).toEqual(["orders", "audit"]);
  });

  it("links each topic to its detail page", () => {
    render(
      <MemoryRouter>
        <TopicTable
          gatewayId="dev"
          topics={[{ name: "orders & audit", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 0 }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "orders & audit" }).getAttribute("href")).toBe(
      "/clusters/dev/topics/orders%20%26%20audit",
    );
  });
});
