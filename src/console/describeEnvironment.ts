import type { ClusterEnvironment } from "./ConsoleAdmin";

// describeEnvironment labels the server-owned classification; unclassified clusters block Kafka writes.
export function describeEnvironment(environment: ClusterEnvironment): string {
  switch (environment) {
    case "PRODUCTION":
      return "Production";
    case "NON_PRODUCTION":
      return "Non-production";
    default:
      return "Unclassified — writes blocked";
  }
}
