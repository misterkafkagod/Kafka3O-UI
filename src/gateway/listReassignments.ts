import type { PartitionReassignment } from "./administration";
import type { FetchJson } from "./fetchJson";
import { isKafkaId } from "./isKafkaId";
import { isRecord } from "./isRecord";

export async function listReassignments(fetchJson: FetchJson, gatewayUrl: string, topic: string): Promise<PartitionReassignment[]> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topic)}/reassignments`;
  const response = await fetchJson(url);
  if (!Array.isArray(response)) throw new Error("The gateway returned invalid reassignment data.");
  return response.map((entry: unknown) => {
    if (!isRecord(entry) || !isKafkaId(entry.partition) ||
        !Array.isArray(entry.replicas) || !entry.replicas.every(isKafkaId) ||
        !Array.isArray(entry.addingReplicas) || !entry.addingReplicas.every(isKafkaId) ||
        !Array.isArray(entry.removingReplicas) || !entry.removingReplicas.every(isKafkaId)) {
      throw new Error("The gateway returned invalid reassignment data.");
    }
    return {
      partition: entry.partition,
      replicas: entry.replicas,
      addingReplicas: entry.addingReplicas,
      removingReplicas: entry.removingReplicas,
    };
  });
}
