import { useState } from "react";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { GatewayCredentialForm } from "./GatewayCredentialForm";

type GatewayCredentialsPanelProps = {
  loadGatewayConfig: LoadGatewayConfig;
  credentials: GatewayCredentials;
};

export function GatewayCredentialsPanel({ loadGatewayConfig, credentials }: GatewayCredentialsPanelProps) {
  const [credentialRevision, setCredentialRevision] = useState(0);
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);
  if (!gateways || gateways.length === 0) {
    return null;
  }
  return (
    <details>
      <summary>Gateway credentials</summary>
      <p>Tokens are stored in this browser session and grant read and write access.</p>
      {gateways.map((gateway) => (
        <GatewayCredentialForm
          key={gateway.id}
          gateway={gateway}
          credentials={credentials}
          credentialRevision={credentialRevision}
          onCredentialChange={() => setCredentialRevision((revision) => revision + 1)}
        />
      ))}
    </details>
  );
}
