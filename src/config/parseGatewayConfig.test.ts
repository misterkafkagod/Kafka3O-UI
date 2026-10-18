import { describe, expect, it } from "vitest";
import { parseGatewayConfig } from "./parseGatewayConfig";

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const prod = { id: "prod", name: "Prod", url: "https://prod.example.com" };

describe("parseGatewayConfig", () => {
  it("returns the entries of a valid two-gateway config", () => {
    expect(parseGatewayConfig({ gateways: [dev, prod] })).toEqual([dev, prod]);
  });

  it("returns an empty list for an empty gateways array", () => {
    expect(parseGatewayConfig({ gateways: [] })).toEqual([]);
  });

  it("returns an empty list when gateways is missing", () => {
    expect(parseGatewayConfig({})).toEqual([]);
  });

  it("returns an empty list for null or non-object input", () => {
    expect(parseGatewayConfig(null)).toEqual([]);
    expect(parseGatewayConfig("text")).toEqual([]);
  });

  it("returns an empty list when a url does not use http or https", () => {
    expect(parseGatewayConfig({ gateways: [dev, { ...prod, url: "javascript:alert(1)" }] })).toEqual([]);
  });

  it("returns an empty list when a field is missing or empty", () => {
    expect(parseGatewayConfig({ gateways: [{ ...dev, name: "" }] })).toEqual([]);
    expect(parseGatewayConfig({ gateways: [{ id: "dev", url: dev.url }] })).toEqual([]);
  });

  it("returns an empty list when two gateways share an id", () => {
    expect(parseGatewayConfig({ gateways: [dev, { ...prod, id: "dev" }] })).toEqual([]);
  });
});
