import { classifyGatewayError } from "./classifyGatewayError";
import { describeGatewayTransportFailure } from "./describeGatewayTransportFailure";
import { HttpError } from "./HttpError";

export type GatewayErrorDescription = {
  title: string;
  detail?: string;
};

export function describeGatewayError(error: unknown, gatewayUrl: string): GatewayErrorDescription {
  const kind = classifyGatewayError(error);
  if (kind === "authentication-required") {
    return { title: "Authentication required", detail: "Enter or update this gateway's token." };
  }
  if (kind === "gateway-unreachable") {
    return { title: "Gateway unreachable", detail: describeGatewayTransportFailure(gatewayUrl) };
  }
  if (kind === "cluster-unreachable") {
    return { title: "Cluster unreachable", detail: error instanceof HttpError ? error.problem?.detail : undefined };
  }
  return {
    title: "Something went wrong",
    detail: error instanceof HttpError ? (error.problem?.detail ?? error.message) : error instanceof Error ? error.message : undefined,
  };
}
