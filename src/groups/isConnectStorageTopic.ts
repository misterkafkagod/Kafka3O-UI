// isConnectStorageTopic recognizes Kafka Connect's own config, offset and status topics (connect-configs,
// kafka3o-connect-offsets, ...), which are worker state rather than data worth backing up.
export function isConnectStorageTopic(name: string): boolean {
  return /(^|[-_.])connect[-_.](configs|offsets|status)$/.test(name);
}
