export type TopicMessageLinkPosition = {
  partition: number;
  offset: string;
};

export type TopicMessageLinkPositionResult =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "position"; position: TopicMessageLinkPosition };

export function topicMessageLinkPosition(params: URLSearchParams): TopicMessageLinkPositionResult {
  const partitions = params.getAll("partition");
  const offsets = params.getAll("offset");
  if (partitions.length === 0 && offsets.length === 0) {
    return { kind: "none" };
  }
  if (partitions.length !== 1 || offsets.length !== 1 || params.has("timestamp")) {
    return { kind: "invalid" };
  }
  const [partition, offset] = [partitions[0], offsets[0]];
  if (
    partition.length > 10 ||
    offset.length > 19 ||
    !/^(0|[1-9]\d*)$/.test(partition) ||
    !/^(0|[1-9]\d*)$/.test(offset) ||
    Number(partition) > 2147483647 ||
    BigInt(offset) > 9223372036854775807n
  ) {
    return { kind: "invalid" };
  }
  return { kind: "position", position: { partition: Number(partition), offset } };
}
