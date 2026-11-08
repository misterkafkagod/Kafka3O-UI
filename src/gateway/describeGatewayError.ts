import { classifyGatewayError } from "./classifyGatewayError";
import { describeAccessDenial } from "./describeAccessDenial";
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
  if (kind === "access-denied") {
    return { title: "Not permitted", detail: describeAccessDenial(error instanceof HttpError ? error.problem?.detail : undefined) };
  }
  if (kind === "change-canceled") {
    return { title: "Change canceled", detail: "No change reason was given, so nothing was sent." };
  }
  if (kind === "authorization-unavailable") {
    return { title: "Authorization unavailable", detail: "The Console could not check your permissions, so nothing was sent to Kafka. Try again later." };
  }
  if (kind === "outcome-unknown") {
    return { title: "Outcome unknown", detail: "The change may have been applied. Do not retry it; reload and check first." };
  }
  if (kind === "cluster-unreachable") {
    return { title: "Cluster unreachable", detail: error instanceof HttpError ? error.problem?.detail : undefined };
  }
  return {
    title: "Something went wrong",
    detail: error instanceof HttpError ? (error.problem?.detail ?? error.message) : error instanceof Error ? error.message : undefined,
  };
}
