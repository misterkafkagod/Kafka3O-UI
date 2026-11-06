import { describeGatewayTransportFailure } from "../gateway/describeGatewayTransportFailure";
import type { GatewayEntry, GatewayErrorKind } from "../gateway/types";
import { GatewayCredentialAction } from "./GatewayCredentialAction";

export function GatewayErrorRecovery({ gateway, kind }: { gateway: GatewayEntry; kind: GatewayErrorKind | undefined }) {
  if (kind === "authentication-required") {
    return <GatewayCredentialAction gateway={gateway} />;
  }
  if (kind === "gateway-unreachable") {
    return <p>{describeGatewayTransportFailure(gateway.url)}</p>;
  }
  return null;
}
