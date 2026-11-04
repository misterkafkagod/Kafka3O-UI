import { describe, expect, it } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { messageLink, type MessageLinkContext } from "./messageLink";

const context: MessageLinkContext = {
  origin: "https://console.example/",
  gatewayId: "dev & west",
  topicName: "orders & audit",
  copyText: async () => {},
};
const message: TopicMessage = {
  partition: 2,
  offset: Number("9007199254740993"),
  offsetExact: "9007199254740993",
  timestamp: "",
  key: null,
  value: null,
  headers: [],
};

describe("messageLink", () => {
  it("encodes gateway, topic, partition, and the exact offset", () => {
    expect(messageLink(context, message)).toBe(
      "https://console.example/clusters/dev%20%26%20west/topics/orders%20%26%20audit/messages?partition=2&offset=9007199254740993",
    );
  });

  it("rejects invalid positions and unsafe offsets from older gateways", () => {
    expect(messageLink(context, { ...message, offsetExact: undefined })).toBeUndefined();
    expect(messageLink(context, { ...message, partition: -1 })).toBeUndefined();
    expect(messageLink(context, { ...message, partition: 2147483648 })).toBeUndefined();
  });
});
