const sizeUnits = ["B", "KB", "MB", "GB", "TB"];

// formatBytes shows a size in binary units, with one decimal above bytes.
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < sizeUnits.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${sizeUnits[unit]}`;
}
