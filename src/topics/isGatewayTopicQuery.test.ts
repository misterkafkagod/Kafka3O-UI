import { describe, expect, it } from "vitest";
import { isGatewayTopicQuery } from "./isGatewayTopicQuery";

describe("isGatewayTopicQuery", () => {
  it("matches the topic's detail, messages and search across gateway aliases", () => {
    expect(isGatewayTopicQuery({ queryKey: ["gateway", "dev", "topic", "orders"] }, "orders")).toBe(true);
    expect(isGatewayTopicQuery({ queryKey: ["gateway", "alias", "topic", "orders", "messages"] }, "orders")).toBe(true);
    expect(isGatewayTopicQuery({ queryKey: ["gateway", "dev", "topic", "audit"] }, "orders")).toBe(false);
    expect(isGatewayTopicQuery({ queryKey: ["gateway", "dev", "topics"] }, "orders")).toBe(false);
  });
});
