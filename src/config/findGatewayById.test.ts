import { describe, expect, it } from "vitest";
import { findGatewayById } from "./findGatewayById";

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const prod = { id: "prod", name: "Prod", url: "http://localhost:8082" };

describe("findGatewayById", () => {
  it("returns the gateway with the given ID", () => {
    expect(findGatewayById([dev, prod], "prod")).toBe(prod);
  });

  it("returns undefined for an unknown or missing ID", () => {
    expect(findGatewayById([dev, prod], "unknown")).toBeUndefined();
    expect(findGatewayById([dev, prod], undefined)).toBeUndefined();
  });
});
