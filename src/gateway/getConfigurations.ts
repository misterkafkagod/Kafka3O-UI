import type { ConfigurationResource, KafkaConfiguration } from "./administration";
import type { FetchJson } from "./fetchJson";
import { getConfigurationUrl } from "./getConfigurationUrl";
import { isRecord } from "./isRecord";

export async function getConfigurations(fetchJson: FetchJson, gatewayUrl: string, resource: ConfigurationResource): Promise<KafkaConfiguration[]> {
  const response = await fetchJson(getConfigurationUrl(gatewayUrl, resource));
  if (!Array.isArray(response)) throw new Error("The gateway returned invalid configuration data.");
  return response.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.name !== "string" ||
        (entry.value !== null && typeof entry.value !== "string") ||
        typeof entry.sensitive !== "boolean" || typeof entry.readOnly !== "boolean" ||
        typeof entry.source !== "string" || typeof entry.type !== "string" ||
        (entry.documentation !== undefined && typeof entry.documentation !== "string")) {
      throw new Error("The gateway returned invalid configuration data.");
    }
    const sensitive = entry.sensitive || entry.type === "PASSWORD";
    return {
      name: entry.name,
      value: sensitive ? null : entry.value,
      sensitive,
      readOnly: entry.readOnly,
      source: entry.source,
      type: entry.type,
      documentation: sensitive ? undefined : entry.documentation,
    };
  });
}
