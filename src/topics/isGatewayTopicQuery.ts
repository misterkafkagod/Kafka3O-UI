import type { Query } from "@tanstack/react-query";

export function isGatewayTopicQuery(query: Pick<Query, "queryKey">, topicName: string): boolean {
  return query.queryKey.length >= 4 && query.queryKey[0] === "gateway" &&
    typeof query.queryKey[1] === "string" && query.queryKey[2] === "topic" && query.queryKey[3] === topicName;
}
