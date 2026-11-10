import type { ApplyOffsetReset } from "./applyOffsetReset";
import type { PreviewOffsetReset } from "./previewOffsetReset";

export type OffsetResetActions = {
  preview: PreviewOffsetReset;
  apply: ApplyOffsetReset;
  confirm: (message: string) => boolean;
};
