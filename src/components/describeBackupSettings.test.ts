import { describe, expect, it } from "vitest";
import { describeBackupSettings } from "./describeBackupSettings";

describe("describeBackupSettings", () => {
  it("describes the defaults", () => {
    expect(describeBackupSettings({ startFrom: "earliest", compression: "gzip", recordsPerFile: 0 })).toEqual({
      startFrom: "From the oldest message", compression: "gzip", recordsPerFile: "No limit" });
  });

  it("describes chosen settings", () => {
    expect(describeBackupSettings({ startFrom: "latest", compression: "none", recordsPerFile: 1500 })).toEqual({
      startFrom: "Messages from when the backup started", compression: "None", recordsPerFile: "Up to 1,500 per file" });
  });

  it("shows unexpected values as they are, and unknown settings as Unknown", () => {
    expect(describeBackupSettings({ startFrom: "none", compression: "lz4", recordsPerFile: 0 }).startFrom).toBe("none");
    expect(describeBackupSettings({ startFrom: "none", compression: "lz4", recordsPerFile: 0 }).compression).toBe("lz4");
    expect(describeBackupSettings(undefined)).toEqual({ startFrom: "Unknown", compression: "Unknown", recordsPerFile: "Unknown" });
  });
});
