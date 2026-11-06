import { isKafkaId } from "../gateway/isKafkaId";

export function parseReplicaIds(text: string, brokerIDs: number[]): number[] | null {
  if (!/^\s*\d+(\s*,\s*\d+)*\s*$/.test(text)) return null;
  const replicas = text.split(",").map((part) => Number(part.trim()));
  if (replicas.some((id) => !isKafkaId(id) || !brokerIDs.includes(id)) ||
      new Set(replicas).size !== replicas.length) return null;
  return replicas;
}
