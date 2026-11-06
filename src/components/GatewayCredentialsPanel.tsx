import { useEffect, useId, useRef, useState } from "react";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { GatewayCredentialForm } from "./GatewayCredentialForm";
import styles from "./GatewayCredentialsPanel.module.css";
import { restoreDialogFocus } from "./restoreDialogFocus";

type GatewayCredentialsPanelProps = {
  loadGatewayConfig: LoadGatewayConfig;
  credentials: GatewayCredentials;
  open: boolean;
  selectedGatewayId?: string;
  onOpen: () => void;
  onClose: () => void;
};

export function GatewayCredentialsPanel({ loadGatewayConfig, credentials, open, selectedGatewayId, onOpen, onClose }: GatewayCredentialsPanelProps) {
  const [credentialRevision, setCredentialRevision] = useState(0);
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const panelId = useId();
  const selectedGateway = findGatewayById(gateways ?? [], selectedGatewayId);
  const isAutomatic = (url: string) => credentials.isAutomatic?.(url) ?? false;
  const focusedGatewayId = selectedGateway
    ? (isAutomatic(selectedGateway.url) ? undefined : selectedGateway.id)
    : gateways?.find((gateway) => !isAutomatic(gateway.url))?.id;
  const hasEditableGateway = gateways?.some((gateway) => !isAutomatic(gateway.url)) ?? false;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog || dialog.open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    (inputRef.current ?? closeRef.current)?.focus();
  }, [open, gateways]);

  if (!gateways || gateways.length === 0) {
    return null;
  }
  return (
    <>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-controls={panelId} onClick={onOpen}>
        Gateway credentials
      </button>
      <dialog
        ref={dialogRef}
        id={panelId}
        className={styles.dialog}
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-description`}
        aria-modal="true"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.close();
          }
        }}
        onClose={() => {
          onClose();
          restoreDialogFocus(openerRef.current, triggerRef.current);
        }}
      >
        {open ? (
          <>
            <h2 id={`${panelId}-title`}>Gateway credentials</h2>
            <p id={`${panelId}-description`}>
              {hasEditableGateway
                ? "Entered tokens are stored in this browser session and grant read and write access."
                : "These local test connections authenticate automatically; no browser tokens are needed."}
            </p>
            {selectedGateway ? <p>Managing credentials for <strong>{selectedGateway.name}</strong>.</p> : null}
            {gateways.map((gateway) => isAutomatic(gateway.url) ? (
              <p key={gateway.id}>
                <strong>{gateway.name}</strong>: Automatic local test connection. The test proxy keeps its Gateway token.
              </p>
            ) : (
              <GatewayCredentialForm
                key={gateway.id}
                gateway={gateway}
                credentials={credentials}
                credentialRevision={credentialRevision}
                onCredentialChange={() => setCredentialRevision((revision) => revision + 1)}
                inputRef={gateway.id === focusedGatewayId ? inputRef : undefined}
              />
            ))}
            <button ref={closeRef} type="button" onClick={() => dialogRef.current?.close()}>Close</button>
          </>
        ) : null}
      </dialog>
    </>
  );
}
