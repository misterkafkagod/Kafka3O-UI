import { classifyGatewayError } from "./classifyGatewayError";
import { HttpError } from "./HttpError";

export type GatewayErrorDescription = {
  title: string;
  detail?: string;
};

export function describeGatewayError(error: unknown): GatewayErrorDescription {
  const kind = classifyGatewayError(error);
  if (kind === "gateway-unreachable") {
    return { title: "Gateway unreachable" };
  }
  if (kind === "cluster-unreachable") {
    return { title: "Cluster unreachable", detail: error instanceof HttpError ? error.problem?.detail : undefined };
  }
  return { title: "Something went wrong", detail: error instanceof Error ? error.message : undefined };
}
