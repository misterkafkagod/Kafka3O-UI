export function restoreDialogFocus(opener: HTMLElement | null, fallback: HTMLElement | null) {
  if (opener?.isConnected) {
    opener.focus();
    if (opener.ownerDocument.activeElement === opener) return;
  }
  fallback?.focus();
}
