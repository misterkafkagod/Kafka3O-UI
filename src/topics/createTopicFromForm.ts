import type { CreateTopicInput } from "../gateway/createTopic";

export type CreateTopicFormResult =
  | { input: CreateTopicInput; error?: never }
  | { input?: never; error: string };

export function createTopicFromForm(name: string, partitions: string, replicationFactor: string): CreateTopicFormResult {
  if (name.length === 0 || name.length > 249 || /[^A-Za-z0-9._-]/.test(name) || name === "." || name === "..") {
    return { error: "Use 1-249 ASCII letters, digits, dots, underscores or hyphens; . and .. are not allowed." };
  }
  if (partitions === "" || /[^0-9]/.test(partitions) || Number(partitions) < 1 || Number(partitions) > 2147483647) {
    return { error: "Partition count must be an integer from 1 to 2147483647." };
  }
  if (replicationFactor === "" || /[^0-9]/.test(replicationFactor) || Number(replicationFactor) < 1 || Number(replicationFactor) > 32767) {
    return { error: "Replication factor must be an integer from 1 to 32767." };
  }
  return { input: { name, partitions: Number(partitions), replicationFactor: Number(replicationFactor) } };
}
