import { HttpError } from "./HttpError";
import type { GatewayErrorKind } from "./types";

const unreachableNames = new Set(["TimeoutError", "AbortError"]);

// Matches by name, not instanceof: fetch's DOMException may come from a different realm than the global one.
export function classifyGatewayError(error: unknown): GatewayErrorKind {
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
