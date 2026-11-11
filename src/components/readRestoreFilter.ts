import type { RestoreSelection } from "../gateway/startRestore";

export type RestoreFilterInput = { from: string; to: string; partitions: string };

export type RestoreFilterResult = { selection: RestoreSelection; error?: undefined } | { selection?: undefined; error: string };

// readRestoreFilter turns the form's local date-times (datetime-local) and comma-separated partitions into a
// selection; empty fields mean "no limit" and all partitions.
export function readRestoreFilter(input: RestoreFilterInput): RestoreFilterResult {
  const selection: RestoreSelection = {};
  const bounds: Array<["from" | "to", string]> = [["from", input.from], ["to", input.to]];
  for (const [name, text] of bounds) {
    if (text.trim() === "") continue;
    const time = new Date(text);
    if (Number.isNaN(time.getTime())) return { error: `Enter a valid ${name === "from" ? "start" : "end"} time.` };
    selection[name] = time.toISOString();
  }
  if (selection.from && selection.to && selection.from >= selection.to) {
    return { error: "The start time must be before the end time." };
  }
  if (input.partitions.trim() !== "") {
    const parts = input.partitions.split(",").map((part) => part.trim());
    if (parts.some((part) => !/^\d{1,9}$/.test(part))) {
      return { error: "Partitions must be numbers separated by commas, for example 0, 2." };
    }
    selection.partitions = [...new Set(parts.map(Number))].sort((a, b) => a - b);
  }
  if (!selection.from && !selection.to && !selection.partitions) {
    return { error: "Choose a time range or partitions, or restore everything." };
  }
  return { selection };
}
