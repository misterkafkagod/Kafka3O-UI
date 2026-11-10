// escapeCsvField quotes a field that holds a comma, quote or line break (RFC 4180).
export function escapeCsvField(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}
