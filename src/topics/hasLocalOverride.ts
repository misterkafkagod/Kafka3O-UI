import type { ConfigurationResource, KafkaConfiguration } from "../gateway/administration";

export function hasLocalOverride(entry: KafkaConfiguration, resource: ConfigurationResource): boolean {
  return entry.source === (resource.kind === "topic" ? "DYNAMIC_TOPIC_CONFIG" : "DYNAMIC_BROKER_CONFIG");
}
