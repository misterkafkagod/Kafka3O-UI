import type { Query } from "@tanstack/react-query";

export function isGatewayTopicListQuery(query: Pick<Query, "queryKey">): boolean {
  return query.queryKey.length === 3 && query.queryKey[0] === "gateway" &&
    typeof query.queryKey[1] === "string" && query.queryKey[2] === "topics";
}
