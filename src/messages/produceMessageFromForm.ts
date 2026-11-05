import type { ProduceMessageInput } from "../gateway/produceTopicMessage";

export type ProduceHeaderField = { id: number; key: string; value: string };

export function produceMessageFromForm(
  value: string,
  includeKey: boolean,
  key: string,
  headers: ProduceHeaderField[],
): ProduceMessageInput {
  return {
    value,
    ...(includeKey ? { key } : {}),
    headers: headers.map((header) => ({ key: header.key, value: header.value })),
  };
}
