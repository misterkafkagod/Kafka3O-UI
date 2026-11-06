import type { ConfigurationChange, ConfigurationResource } from "./administration";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { getConfigurationUrl } from "./getConfigurationUrl";
import { requireAcceptedAdministration } from "./requireAcceptedAdministration";

export async function alterConfiguration(fetchWrite: FetchGatewayWrite, gatewayUrl: string, resource: ConfigurationResource, change: ConfigurationChange): Promise<void> {
  const response = await fetchWrite(getConfigurationUrl(gatewayUrl, resource), { method: "POST", body: JSON.stringify(change) });
  requireAcceptedAdministration(response, "name", change.name);
}
