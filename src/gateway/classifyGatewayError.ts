import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { HttpError } from "./HttpError";
import type { GatewayErrorKind } from "./types";

const unreachableNames = new Set(["TimeoutError", "AbortError"]);

// Matches by name, not instanceof: fetch's DOMException may come from a different realm than the global one.
export function classifyGatewayError(error: unknown): GatewayErrorKind {
  if (error instanceof ProductionChangeCanceled) {
    return "change-canceled";
  }
  if (error instanceof HttpError && error.status === 401) {
    return "authentication-required";
  }
  if (error instanceof HttpError && error.status === 403 && error.problem?.code === "forbidden") {
    return "access-denied";
  }
  if (error instanceof HttpError && error.problem?.code === "authorization_unavailable") {
    return "authorization-unavailable";
  }
  if (error instanceof HttpError && (error.problem?.code === "gateway_outcome_unknown" || error.problem?.code === "outcome_unknown")) {
    return "outcome-unknown";
  }
  if (error instanceof HttpError && error.problem?.code === "gateway_unavailable") {
    return "gateway-unreachable";
  }
  if (error instanceof HttpError && error.problem?.code === "cluster_unreachable") {
    return "cluster-unreachable";
  }
  if (error instanceof TypeError) {
    return "gateway-unreachable";
  }
  const name = (error as { name?: unknown } | null)?.name;
  if (typeof name === "string" && unreachableNames.has(name)) {
    return "gateway-unreachable";
  }
  return "other";
}
