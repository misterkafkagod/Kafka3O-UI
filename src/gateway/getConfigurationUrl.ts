import type { ConfigurationResource } from "./administration";

export function getConfigurationUrl(gatewayUrl: string, resource: ConfigurationResource): string {
  const base = gatewayUrl.replace(/\/+$/, "");
  return resource.kind === "topic"
    ? `${base}/api/v1/topics/${encodeURIComponent(resource.name)}/config`
    : `${base}/api/v1/brokers/${resource.id}/config`;
}
