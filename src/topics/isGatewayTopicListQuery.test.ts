import { describe, expect, it } from "vitest";
import { isGatewayTopicListQuery } from "./isGatewayTopicListQuery";

describe("isGatewayTopicListQuery", () => {
  it("matches topic lists for every gateway without matching details or config", () => {
    expect(isGatewayTopicListQuery({ queryKey: ["gateway", "dev", "topics"] })).toBe(true);
    expect(isGatewayTopicListQuery({ queryKey: ["gateway", "alias", "topics"] })).toBe(true);
    expect(isGatewayTopicListQuery({ queryKey: ["gateway", "dev", "topic", "orders"] })).toBe(false);
    expect(isGatewayTopicListQuery({ queryKey: ["config"] })).toBe(false);
  });
});
