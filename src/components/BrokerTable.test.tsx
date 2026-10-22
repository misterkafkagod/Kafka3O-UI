import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrokerTable } from "./BrokerTable";

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).getAllByRole("row").map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("BrokerTable", () => {
  it("lists brokers sorted by ID", () => {
    render(
      <BrokerTable
        brokers={[
          { id: 3, host: "kafka-3", port: 9092 },
          { id: 1, host: "kafka-1", port: 9092 },
          { id: 2, host: "kafka-2", port: 9093 },
        ]}
      />,
    );

    expect(bodyRows().map((cells) => cells[0])).toEqual(["1", "2", "3"]);
    expect(bodyRows()[1][1]).toBe("kafka-2:9093");
  });

  it("shows a dash when a broker has no rack", () => {
    render(
      <BrokerTable
        brokers={[
          { id: 1, host: "kafka-1", port: 9092, rack: "eu-1a" },
          { id: 2, host: "kafka-2", port: 9092 },
        ]}
      />,
    );

    expect(bodyRows()[0][2]).toBe("eu-1a");
    expect(bodyRows()[1][2]).toBe("—");
  });
});
